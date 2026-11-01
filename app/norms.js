// Normal active range of motion, in degrees: the end of the normal range for each joint and movement.
// Source of the defaults: the AAOS averages as tabled in Norkin & White, "Measurement of Joint Motion".
// Course material or another reference may differ by a few degrees: edit any number here and the exam
// chart's norm line follows on the next load. 0 (full extension) or null draws no norm line.
//
// "names" are the ways a movement may be written in the form (English and Hebrew, any case). A name is
// matched as a whole word, and the longest match wins, so "Dorsiflexion" is not read as "Flexion".
// "regions" says which joints a session region looks in when the extracted movement names no joint.
window.ROM_NORMS = {
  source: 'AAOS (Norkin & White)',
  joints: {
    shoulder: {
      he: 'כתף',
      motions: [
        { deg: 180, he: 'כפיפה', names: ['flexion', 'flex', 'כפיפה', 'פלקשן', 'פלקסיה', 'הרמה קדימה'] },
        { deg: 60, he: 'פשיטה', names: ['extension', 'ext', 'פשיטה', 'אקסטנשן', 'אקסטנציה'] },
        { deg: 180, he: 'הרחקה', names: ['abduction', 'abd', 'הרחקה', 'אבדוקציה'] },
        { deg: 90, he: 'סיבוב חיצוני', names: ['external rotation', 'er', 'ext rot', 'סיבוב חיצוני', 'רוטציה חיצונית'] },
        { deg: 70, he: 'סיבוב פנימי', names: ['internal rotation', 'ir', 'int rot', 'סיבוב פנימי', 'רוטציה פנימית'] }
      ]
    },
    elbow: {
      he: 'מרפק',
      motions: [
        { deg: 150, he: 'כפיפה', names: ['flexion', 'flex', 'כפיפה', 'פלקשן', 'פלקסיה'] },
        { deg: 0, he: 'פשיטה', names: ['extension', 'ext', 'פשיטה', 'יישור', 'אקסטנשן', 'אקסטנציה'] }
      ]
    },
    forearm: {
      he: 'אמה',
      motions: [
        { deg: 80, he: 'פרונציה', names: ['pronation', 'פרונציה'] },
        { deg: 80, he: 'סופינציה', names: ['supination', 'סופינציה'] }
      ]
    },
    wrist: {
      he: 'שורש כף היד',
      motions: [
        { deg: 80, he: 'כפיפה', names: ['flexion', 'flex', 'palmar flexion', 'כפיפה', 'פלקשן', 'פלקסיה'] },
        { deg: 70, he: 'פשיטה', names: ['extension', 'ext', 'dorsal flexion', 'פשיטה', 'אקסטנשן', 'אקסטנציה'] },
        { deg: 20, he: 'סטייה רדיאלית', names: ['radial deviation', 'rd', 'סטייה רדיאלית', 'רדיאל דביאציה'] },
        { deg: 30, he: 'סטייה אולנרית', names: ['ulnar deviation', 'ud', 'סטייה אולנרית', 'אולנר דביאציה'] }
      ]
    },
    hip: {
      he: 'ירך',
      motions: [
        { deg: 120, he: 'כפיפה', names: ['flexion', 'flex', 'כפיפה', 'פלקשן', 'פלקסיה'] },
        { deg: 30, he: 'פשיטה', names: ['extension', 'ext', 'פשיטה', 'אקסטנשן', 'אקסטנציה'] },
        { deg: 45, he: 'הרחקה', names: ['abduction', 'abd', 'הרחקה', 'אבדוקציה'] },
        { deg: 30, he: 'קירוב', names: ['adduction', 'add', 'קירוב', 'אדוקציה', 'אדדוקציה'] },
        { deg: 45, he: 'סיבוב חיצוני', names: ['external rotation', 'er', 'ext rot', 'סיבוב חיצוני', 'רוטציה חיצונית'] },
        { deg: 45, he: 'סיבוב פנימי', names: ['internal rotation', 'ir', 'int rot', 'סיבוב פנימי', 'רוטציה פנימית'] }
      ]
    },
    knee: {
      he: 'ברך',
      motions: [
        { deg: 135, he: 'כפיפה', names: ['flexion', 'flex', 'כפיפה', 'פלקשן', 'פלקסיה'] },
        { deg: 0, he: 'פשיטה', names: ['extension', 'ext', 'פשיטה', 'יישור', 'אקסטנשן', 'אקסטנציה'] }
      ]
    },
    ankle: {
      he: 'קרסול',
      motions: [
        { deg: 20, he: 'דורסיפלקסיה', names: ['dorsiflexion', 'dorsi flexion', 'df', 'דורסיפלקשן', 'דורסיפלקסיה', 'כפיפה גבית'] },
        { deg: 50, he: 'פלנטרפלקסיה', names: ['plantarflexion', 'plantar flexion', 'pf', 'פלנטרפלקשן', 'פלנטר פלקשן', 'פלנטרפלקסיה', 'כפיפה פלנטרית'] },
        { deg: 35, he: 'אינברסיה', names: ['inversion', 'אינברסיה', 'אינוורסיה'] },
        { deg: 15, he: 'אברסיה', names: ['eversion', 'אברסיה', 'איוורסיה'] }
      ]
    },
    cervical: {
      he: 'עמוד שדרה צווארי',
      motions: [
        { deg: 45, he: 'כפיפה', names: ['flexion', 'flex', 'כפיפה', 'פלקשן', 'פלקסיה'] },
        { deg: 45, he: 'פשיטה', names: ['extension', 'ext', 'פשיטה', 'אקסטנשן', 'אקסטנציה'] },
        { deg: 45, he: 'כפיפה צידית', names: ['lateral flexion', 'side flexion', 'side bending', 'lat flex', 'כפיפה צידית', 'כפיפה לצד'] },
        { deg: 60, he: 'רוטציה', names: ['rotation', 'rot', 'רוטציה', 'סיבוב'] }
      ]
    },
    lumbar: {
      he: 'עמוד שדרה מותני',
      motions: [
        { deg: 80, he: 'כפיפה', names: ['flexion', 'flex', 'כפיפה', 'פלקשן', 'פלקסיה'] },
        { deg: 25, he: 'פשיטה', names: ['extension', 'ext', 'פשיטה', 'אקסטנשן', 'אקסטנציה'] },
        { deg: 35, he: 'כפיפה צידית', names: ['lateral flexion', 'side flexion', 'side bending', 'lat flex', 'כפיפה צידית', 'כפיפה לצד'] },
        { deg: 45, he: 'רוטציה', names: ['rotation', 'rot', 'רוטציה', 'סיבוב'] }
      ]
    }
  },
  // the session region → joints to look in, in order, when the movement does not name its joint
  regions: {
    'צוואר וראש': ['cervical'],
    'כתף': ['shoulder'],
    'מרפק': ['elbow', 'forearm', 'wrist'],
    'שורש כף יד וכף יד': ['wrist', 'forearm'],
    'גב תחתון': ['lumbar', 'hip'],
    'ירך ואגן': ['hip'],
    'ברך': ['knee', 'hip'],
    'קרסול וכף רגל': ['ankle']
  }
};
