# קוד המקור של המפה

`index.html` שבשורש המאגר נבנה מהקבצים כאן. **לא עורכים את `index.html` ישירות** — כל שינוי (תוכן או עיצוב) נעשה כאן ונבנה מחדש.

- `template.html` — מנוע התצוגה: HTML, CSS ו־JS. המקום `/*DATA*/` מתמלא בקבצי הנתונים.
- קבצי נתונים: `data.js` (מבדקים, מסגרת כללית, אזורים), `extras.js` (סרטונים, ראשי תיבות), `tx1.js`–`tx3.js` (כרטיסי מבדקים), `evguide.js` (מדריך הראיות), `found.js` (לשונית "עקרונות"), `tissue.js` (לשונית "רקמות").
- חוזה עם העוזר הקליני (`app/kb-site.js` בענף `app`): שמות הליטרלים `T, GENERAL, REGIONS, FIVE_D, THREE_N, TEST_GEN, TX, TX2, TX3, FOUND, TISSUE` נשארים בתחילת שורה כ־`const NAME = {`.

## בנייה ובדיקה (משורש המאגר)

```
node src/build.js && python3 src/build-site.py     # בונה את index.html
cd src && npm install && node check3.js             # בדיקת תצוגה של כל כרטיסי המבדקים (jsdom)
```

## ענפים

- `old` — העיצוב הקיים, עם כל התוכן עד שיעור 3.
- `new` — העיצוב החדש (בעבודה).
- `main` — מה שבאוויר. ממזגים אליו רק כשפלטון מבקש.
