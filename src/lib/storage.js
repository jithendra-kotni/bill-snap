import { get, set } from 'idb-keyval';

export async function loadBills() {
  try { return (await get('bills')) || []; } catch { return []; }
}
export async function saveBills(bills) {
  await set('bills', bills);
}