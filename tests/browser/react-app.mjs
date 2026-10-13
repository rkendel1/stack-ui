// A small React app over @stack-ui/react, bundled for the browser by
// react.test.mjs. It exercises behaviour static parity cannot see: controlled
// and uncontrolled fields, and modal dialogs driven by state.
import { createElement as h, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TextField, ConfirmAction, Dialog, Button } from '@stack-ui/react';

window.log = [];
function App() {
  const [free, setFree] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  // The page behind a modal is inert, so the test ends the "request" here.
  window.finishRequest = () => setBusy(false);
  return h('main', { id: 'app' },
    h('h1', null, 'React'),
    // onChange without value: free to type in, and every edit is reported.
    TextField({ name: 'free', label: 'Free field', onChange: (value) => { setFree(value); window.log.push(['free', value]); } }),
    h('p', { id: 'free-echo' }, free),
    h('button', { id: 'ask', type: 'button', onClick: () => setOpen(true) }, 'Revoke'),
    h('button', { id: 'edit', type: 'button', onClick: () => setEditing(true) }, 'Edit'),
    h(ConfirmAction, {
      id: 'react-confirm', open, busy, title: 'Revoke API key ci?', confirmLabel: 'Revoke API key', requireText: 'ci',
      consequences: ['Requests that present this key are refused.'],
      onCancel: () => { window.log.push(['cancel']); setOpen(false); },
      onConfirm: () => { window.log.push(['confirm']); setBusy(true); },
    }),
    h(Dialog, {
      id: 'react-dialog', open: editing, title: 'Edit value',
      onClose: () => { window.log.push(['close']); setEditing(false); },
      actions: h(Button, { label: 'Done', onClick: () => setEditing(false) }),
    }),
  );
}
createRoot(document.getElementById('root')).render(h(App));
