document.addEventListener('DOMContentLoaded', () => {
  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
  }

  // FAQ accordion
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    if (!q) return;
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => i !== item && i.classList.remove('open'));
      item.classList.toggle('open', !isOpen);
    });
  });

  initScanDemo();
  initRegisterForm();
});

// ---------------- Registration + Lemon Squeezy checkout flow ----------------
// Point this at your deployed backend (see /server/README.md).
// Use http://localhost:4242 while testing locally.
const BRANDSHIELD_BACKEND_URL = 'https://your-brandshield-backend.example.com';

function initRegisterForm() {
  const form = document.getElementById('order-form');
  if (!form) return;

  const statusEl = document.getElementById('checkout-status');
  const submitBtn = document.getElementById('checkout-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const plan = form.querySelector('#plan-select').value; // 'single' | 'multi'
    const name = form.querySelector('#full-name').value.trim();
    const email = form.querySelector('#email').value.trim();
    const mobile = form.querySelector('#mobile').value.trim();
    const password = form.querySelector('#password').value;
    const aliasesRaw = form.querySelector('#aliases')?.value.trim() || '';
    const aliases = aliasesRaw ? aliasesRaw.split(',').map((a) => a.trim()).filter(Boolean) : [name];
    const originalLinksRaw = form.querySelector('#original-links')?.value.trim() || '';
    const originalLinks = originalLinksRaw ? originalLinksRaw.split('\n').map((l) => l.trim()).filter(Boolean) : [];

    let platforms = [];
    if (plan === 'single') {
      platforms = [form.querySelector('#platform-single').value];
    } else {
      platforms = Array.from(form.querySelectorAll('.platform-checkbox:checked')).map((cb) => cb.value);
    }

    if (!name || !email || !mobile || !password) return;
    if (!platforms.length) {
      if (statusEl) { statusEl.textContent = 'Select at least one platform.'; statusEl.style.color = '#F5586B'; }
      return;
    }
    if (plan === 'multi' && platforms.length < 2) {
      if (statusEl) { statusEl.textContent = 'Select 2 or more platforms for the Multi-Platform plan, or switch to Single Platform.'; statusEl.style.color = '#F5586B'; }
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account…';
    if (statusEl) statusEl.textContent = '';

    try {
      const res = await fetch(`${BRANDSHIELD_BACKEND_URL}/api/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan, platforms, name, email, mobile, password, aliases, originalLinks }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Registration could not be started');
      }
      const { checkoutUrl } = await res.json();

      const resultPanel = document.getElementById('order-result');
      if (resultPanel) {
        document.getElementById('ref-code-value').textContent = 'Account created';
        document.getElementById('order-summary').textContent = `${plan === 'multi' ? 'Multi-Platform' : 'Single Platform'} — redirecting to Lemon Squeezy…`;
        resultPanel.classList.remove('hidden');
      }

      // Lemon Squeezy's hosted checkout is a plain redirect — no signed
      // payload needed (unlike the PayFast flow this replaced).
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error('Registration/checkout error:', err);
      if (statusEl) {
        statusEl.textContent = err.message || 'Could not reach the server. Please try again in a moment.';
        statusEl.style.color = '#F5586B';
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Continue to Checkout';
    }
  });
}

// ---------------- Live scan-to-takedown demo cycle ----------------
function initScanDemo() {
  const rows = document.querySelectorAll('[data-demo-row]');
  if (!rows.length) return;

  const stages = ['found', 'sent', 'removed'];
  const dotEl = (row) => row.querySelector('.dot');
  const badgeEl = (row) => row.querySelector('.badge');

  const stageLabel = { found: 'Leak Found', sent: 'DMCA Sent', removed: 'Removed' };

  let tick = 0;
  setInterval(() => {
    tick++;
    rows.forEach((row, i) => {
      const stageIndex = (tick + i) % stages.length;
      const stage = stages[stageIndex];
      const dot = dotEl(row);
      const badge = badgeEl(row);
      if (dot) {
        dot.className = 'dot ' + stage;
      }
      if (badge) {
        badge.className = 'badge ' + stage;
        badge.textContent = stageLabel[stage];
      }
    });
  }, 2200);
}
