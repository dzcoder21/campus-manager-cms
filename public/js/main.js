// Basic helpers for forms
(function () {
  // Confirm deletes
  document.addEventListener('click', function (e) {
    if (e.target.matches('[data-confirm]')) {
      const msg = e.target.getAttribute('data-confirm') || 'Are you sure?';
      if (!confirm(msg)) {
        e.preventDefault();
      }
    }
  });

  // Auto-select Department based on Course for Module forms
  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'module-course-select') {
      const select = e.target;
      const option = select.options[select.selectedIndex];
      const deptId = option ? option.getAttribute('data-dept') : '';
      const deptSelect = document.getElementById('module-dept-select');
      if (deptSelect && deptId) {
        deptSelect.value = deptId;
      }
    }
  });

  // Admin student form helpers
  function bindStudentFormToggles() {
    const createLogin = document.getElementById('createLogin');
    const password = document.querySelector('input[name="password"]');
    const resetPassword = document.querySelector('input[name="resetPassword"]');
    if (createLogin && password) {
      const update = () => {
        const on = createLogin.checked;
        password.disabled = !on;
        if (on) {
          password.setAttribute('required', 'required');
        } else {
          password.removeAttribute('required');
        }
      };
      createLogin.addEventListener('change', update);
      update();
    }
    if (resetPassword) {
      // resetPassword is optional; ensure it's not required
      resetPassword.removeAttribute('required');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindStudentFormToggles);
  } else {
    bindStudentFormToggles();
  }

  function getAssistantAnswer(question) {
    const q = String(question || '').trim().toLowerCase();
    if (!q) return 'Please type a question first.';

    if (q.includes('department')) return 'Open Departments page: /departments. There you can view, add, edit, and manage departments.';
    if (q.includes('course')) return 'Open Courses page: /courses. You can explore available courses and course details there.';
    if (q.includes('module')) return 'Open Modules page: /modules. This section helps you browse and manage course modules.';
    if (q.includes('student')) return 'For student records, open /students (admin). Students can use /portal/my-courses in student login.';
    if (q.includes('certificate')) return 'Admin can issue certificate from Student details page. Students can download from /portal/certificates.';
    if (q.includes('login') || q.includes('sign in')) return 'Use /login to sign in. Admin manages records, and students access their portal after login.';
    if (q.includes('catalog')) return 'Course catalog is available at /catalog where students can browse and enroll in courses.';
    if (q.includes('enroll')) return 'Students can enroll through catalog and track enrollments in /portal/my-courses.';
    if (q.includes('help')) return 'Try asking about: departments, courses, modules, students, certificates, login, catalog, or enrollment.';

    return 'I can help with university CMS topics. Ask about departments, courses, modules, students, login, catalog, enrollment, or certificates.';
  }

  function bindHomeAssistant() {
    const form = document.getElementById('chatgptAssistantForm');
    const input = document.getElementById('chatgptAssistantInput');
    const panel = document.getElementById('chatgptAnswerPanel');
    if (!form || !input || !panel) return;

    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const question = String(input.value || '').trim();
      if (!question) {
        panel.textContent = 'Please type a question first.';
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      panel.textContent = 'Thinking...';

      try {
        const response = await fetch('/api/assistant/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
        });

        const data = await response.json().catch(() => ({}));
        const apiAnswer = data && typeof data.answer === 'string' ? data.answer : '';

        // Keep output text-only to avoid rendering arbitrary HTML.
        panel.textContent = apiAnswer || getAssistantAnswer(question);
      } catch (err) {
        panel.textContent = getAssistantAnswer(question);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindHomeAssistant);
  } else {
    bindHomeAssistant();
  }
})();
