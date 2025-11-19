const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Adding cost_summary column to video_jobs table...');

db.run(`ALTER TABLE video_jobs ADD COLUMN cost_summary TEXT`, (err) => {
  if (err) {
    if (err.message.includes('duplicate column')) {
      console.log('✅ Column already exists');
    } else {
      console.error('❌ Error:', err.message);
    }
  } else {
    console.log('✅ Column added successfully');
  }
  
  // Verify the column was added
  db.all(`PRAGMA table_info(video_jobs)`, (err, rows) => {
    if (err) {
      console.error('❌ Error checking table:', err.message);
    } else {
      const hasCostSummary = rows.find(r => r.name === 'cost_summary');
      console.log('\n📋 Table columns:');
      rows.forEach(r => console.log(`  - ${r.name} (${r.type})`));
      console.log(`\n${hasCostSummary ? '✅' : '❌'} cost_summary column present: ${!!hasCostSummary}`);
    }
    db.close();
  });
});
