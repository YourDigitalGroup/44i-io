// Opening a group must never blank a saved Digital/Covering Strategist name (a blank got saved over it).
const { read, fn, check, done } = require('./lib');
const src = fn(read('admin/index.html'), 'populateDigitalStrategistDropdown');
const mk = (staff) => {
  const sel = { options: [], _v: '', set innerHTML(h) { this.options = [...h.matchAll(/<option value="([^"]*)">/g)].map(m => m[1]); this._v = this.options.includes(this._v) ? this._v : ''; },
    get value() { return this._v; }, set value(v) { this._v = this.options.includes(v) ? v : ''; },
    insertAdjacentHTML(_, h) { this.options.push(...[...h.matchAll(/<option value="([^"]*)">/g)].map(m => m[1])); } };
  const run = new Function('ALL_STAFF', 'document', 'esc', src + '; return populateDigitalStrategistDropdown;');
  return { sel, populate: run(staff, { getElementById: () => sel }, s => String(s)) };
};
const staff = [{ name: 'Bronson', role: 'strategist', active: true }, { name: 'Jon', role: 'super', active: true }, { name: 'Dana', role: 'am', active: true }];
let t = mk(staff); t.populate('x', 'Bronson'); check('normal name is selected', t.sel.value, 'Bronson');
t = mk(staff); t.populate('x', 'bronson'); check('different capitals still selects the person', t.sel.value, 'Bronson');
t = mk([]); t.populate('x', 'Bronson'); check('staff list failed to load: saved name is kept, not blanked', t.sel.value, 'Bronson');
t = mk(staff); t.populate('x', 'Dana'); check('person whose role is not strategist/super: saved name is kept', t.sel.value, 'Dana');
t = mk(staff); t.populate('x', 'Bron'); check('misspelled saved name is kept', t.sel.value, 'Bron');
t = mk(staff); t.populate('x', null); check('no saved name stays blank', t.sel.value, '');
done();
