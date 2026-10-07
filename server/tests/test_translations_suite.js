// server/test_translations_suite.js
// Automated Translation Coverage & Variable Interpolation Audit
const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function runTranslationAudit() {
  console.log('====================================================');
  console.log('RUNNING ONECOOLIE TRANSLATION COVERAGE AUDIT');
  console.log('====================================================\n');

  const enPath = path.join(__dirname, '..', '..', 'client', 'src', 'locales', 'en.js');
  const tePath = path.join(__dirname, '..', '..', 'client', 'src', 'locales', 'te.js');
  const hiPath = path.join(__dirname, '..', '..', 'client', 'src', 'locales', 'hi.js');

  assert.ok(fs.existsSync(enPath), 'en.js must exist');
  assert.ok(fs.existsSync(tePath), 'te.js must exist');
  assert.ok(fs.existsSync(hiPath), 'hi.js must exist');

  // Dynamic import of ESM modules
  const enModule = await import('file://' + enPath.replace(/\\/g, '/'));
  const teModule = await import('file://' + tePath.replace(/\\/g, '/'));
  const hiModule = await import('file://' + hiPath.replace(/\\/g, '/'));

  const en = enModule.default;
  const te = teModule.default;
  const hi = hiModule.default;

  function flattenKeys(obj, prefix = '') {
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        Object.assign(res, flattenKeys(v, fullKey));
      } else {
        res[fullKey] = String(v);
      }
    }
    return res;
  }

  const enFlat = flattenKeys(en);
  const teFlat = flattenKeys(te);
  const hiFlat = flattenKeys(hi);

  const enKeys = Object.keys(enFlat);
  const teKeys = Object.keys(teFlat);
  const hiKeys = Object.keys(hiFlat);

  console.log(`Total Keys in English (EN): ${enKeys.length}`);
  console.log(`Total Keys in Telugu  (TE): ${teKeys.length}`);
  console.log(`Total Keys in Hindi   (HI): ${hiKeys.length}\n`);

  // Check missing keys in Telugu
  const missingInTe = enKeys.filter(k => !(k in teFlat));
  const missingInHi = enKeys.filter(k => !(k in hiFlat));

  const extraInTe = teKeys.filter(k => !(k in enFlat));
  const extraInHi = hiKeys.filter(k => !(k in enFlat));

  let issues = 0;

  if (missingInTe.length > 0) {
    console.error(`❌ Missing keys in Telugu (${missingInTe.length}):`, missingInTe);
    issues++;
  } else {
    console.log('✓ 100% key parity between English and Telugu');
  }

  if (missingInHi.length > 0) {
    console.error(`❌ Missing keys in Hindi (${missingInHi.length}):`, missingInHi);
    issues++;
  } else {
    console.log('✓ 100% key parity between English and Hindi');
  }

  if (extraInTe.length > 0) {
    console.warn(`⚠️ Extra keys in Telugu (${extraInTe.length}):`, extraInTe);
  }

  if (extraInHi.length > 0) {
    console.warn(`⚠️ Extra keys in Hindi (${extraInHi.length}):`, extraInHi);
  }

  // Check interpolation variables: e.g. {name}, {amount}
  function extractVariables(str) {
    const matches = str.match(/\{([a-zA-Z0-9_]+)\}/g) || [];
    return matches.sort();
  }

  for (const key of enKeys) {
    const enVars = extractVariables(enFlat[key]);
    if (enVars.length > 0) {
      if (teFlat[key]) {
        const teVars = extractVariables(teFlat[key]);
        assert.deepStrictEqual(teVars, enVars, `Variable mismatch in Telugu for key "${key}"`);
      }
      if (hiFlat[key]) {
        const hiVars = extractVariables(hiFlat[key]);
        assert.deepStrictEqual(hiVars, enVars, `Variable mismatch in Hindi for key "${key}"`);
      }
    }
  }

  console.log('✓ All interpolation variables match perfectly across en, te, hi\n');

  if (issues > 0) {
    console.error(`❌ AUDIT FAILED with ${issues} issues.`);
    process.exit(1);
  }

  console.log('====================================================');
  console.log('STATUS: TRANSLATION COVERAGE AUDIT PASSED 100%! ✓');
  console.log('====================================================');
}

runTranslationAudit().catch(err => {
  console.error('Audit fatal error:', err);
  process.exit(1);
});
