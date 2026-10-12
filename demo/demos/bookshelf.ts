import 'folio3d/style.css';
import '../site.css';
import './demos.css';
import { catalog, magazine, portfolio } from './publications';
import { openPublication } from './reader';

const publications = { magazine, catalog, portfolio };
document.querySelectorAll<HTMLButtonElement>('[data-read]').forEach((button) => {
  const key = button.dataset.read as keyof typeof publications;
  button.addEventListener('click', () => {
    button.focus();
    openPublication(publications[key]);
  });
});
const input = document.querySelector<HTMLInputElement>('#local-pdf')!;
input.addEventListener('change', () => {
  const file = input.files?.[0];
  if (!file) return;
  input.focus();
  openPublication({ title: file.name, source: { type: 'pdf', data: file }, sections: [] });
  // Allow reopening the same local file after closing the reader.
  input.value = '';
});
