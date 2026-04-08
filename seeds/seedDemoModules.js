require('dotenv').config();
const mongoose = require('mongoose');
require('../models/Department');
const Course = require('../models/Course');
const Module = require('../models/Module');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/university-cms';

const moduleTemplates = {
  BTCS: [
    {
      name: 'Programming Fundamentals',
      code: 'BTCS101',
      credits: 4,
      semester: 1,
      isCore: true,
      lecturer: 'Prof. Anil Verma',
      description: 'Introduction to problem solving, algorithms, and basic programming.',
    },
    {
      name: 'Data Structures',
      code: 'BTCS201',
      credits: 4,
      semester: 3,
      isCore: true,
      lecturer: 'Prof. Meera Joshi',
      description: 'Core linear and non-linear data structures and their applications.',
    },
  ],
  MTDS: [
    {
      name: 'Machine Learning',
      code: 'MTDS501',
      credits: 4,
      semester: 1,
      isCore: true,
      lecturer: 'Dr. Karan Gupta',
      description: 'Supervised and unsupervised learning techniques with practical use cases.',
    },
    {
      name: 'Big Data Analytics',
      code: 'MTDS602',
      credits: 3,
      semester: 2,
      isCore: false,
      lecturer: 'Dr. Ritu Malhotra',
      description: 'Large-scale data processing, analysis pipelines, and distributed systems.',
    },
  ],
  BCA: [
    {
      name: 'Web Development',
      code: 'BCA102',
      credits: 3,
      semester: 2,
      isCore: true,
      lecturer: 'Prof. Nisha Kapoor',
      description: 'Front-end and back-end web development concepts and implementation.',
    },
    {
      name: 'Database Management Systems',
      code: 'BCA203',
      credits: 4,
      semester: 3,
      isCore: true,
      lecturer: 'Prof. Rohit Sinha',
      description: 'Relational databases, SQL, normalization, and transaction management.',
    },
  ],
};

async function run() {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    const courseCodes = Object.keys(moduleTemplates);
    const courses = await Course.find({ code: { $in: courseCodes } }).select('_id code department');
    const courseByCode = new Map(courses.map((course) => [course.code, course]));

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const courseCode of courseCodes) {
      const course = courseByCode.get(courseCode);
      if (!course) {
        skipped += moduleTemplates[courseCode].length;
        continue;
      }

      for (const template of moduleTemplates[courseCode]) {
        let moduleDoc = await Module.findOne({ code: template.code });
        if (!moduleDoc) {
          moduleDoc = new Module();
          created += 1;
        } else {
          updated += 1;
        }

        moduleDoc.name = template.name;
        moduleDoc.code = template.code;
        moduleDoc.course = course._id;
        moduleDoc.department = course.department;
        moduleDoc.description = template.description;
        moduleDoc.credits = template.credits;
        moduleDoc.semester = template.semester;
        moduleDoc.isCore = template.isCore;
        moduleDoc.lecturer = template.lecturer;
        moduleDoc.learningOutcomes = [];
        moduleDoc.prerequisites = [];

        await moduleDoc.save();
      }
    }

    console.log(`Demo modules ready. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding demo modules:', error.message);
    process.exit(1);
  }
}

run();
