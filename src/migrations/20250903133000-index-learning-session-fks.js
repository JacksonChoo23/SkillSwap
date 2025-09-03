'use strict';

module.exports = {
  async up (qi) {
    try { await qi.addIndex('learning_sessions', ['teacher_id'], { name: 'ls_teacher_id' }); } catch(e) {}
    try { await qi.addIndex('learning_sessions', ['student_id'], { name: 'ls_student_id' }); } catch(e) {}
    try { await qi.addIndex('learning_sessions', ['status'], { name: 'ls_status' }); } catch(e) {}
  },
  async down (qi) {
    try { await qi.removeIndex('learning_sessions', 'ls_teacher_id'); } catch(e) {}
    try { await qi.removeIndex('learning_sessions', 'ls_student_id'); } catch(e) {}
    try { await qi.removeIndex('learning_sessions', 'ls_status'); } catch(e) {}
  }
};


