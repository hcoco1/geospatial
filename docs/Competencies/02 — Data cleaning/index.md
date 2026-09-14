# Competency 2 — Data Cleaning

## 1. What I am able to do

- I can find messy or inconsistent values in a field and fix them step by step, not just guess.
- Different date formats mixed in one column don't throw me off — I can convert them safely into a real date type.
- Duplicate IDs get fixed using a reliable key from the database, instead of patching values by hand.
- When a value is missing, I keep a record of the reason instead of just deleting it, using a flag column.
- After a mistake, data can be recovered using an untouched backup table and a stable ID to join the two together.
- A real duplicate and two different records that just happen to share one value are not the same thing, and I know how to tell them apart.
- Mixed units can be converted into one standard unit, with the precision kept realistic instead of overstated.
- If something in my own work turns out to be missed, I go back and fix it instead of leaving it out.
- Results get checked with simple counts, not just by looking at the data.

## 2. Professional knowledge

Cleaning text usually means fixing two different kinds of problems: small formatting issues like spacing or capital letters, and real content issues like typos or translated words. A simple rule handles the first kind. The second kind needs a manual list, because guessing at the "right" value is risky.

Changing a column's data type is risky too. If the rule inside the conversion is wrong, it can quietly turn every value into NULL instead of just the bad ones — that's exactly what happened with the price field. That's why testing the logic with a plain `SELECT` comes first, before anything that actually changes the table.

A duplicate ID breaks joins, and the error it causes can show up somewhere completely unrelated. Here, a broken join looked at first like a date problem, until it was joined on a different, unique column instead, and the real cause became clear.

Undoing a mistake depends on two things: an untouched backup, and an ID that stays the same in both tables. Flag columns also make it possible to tell which missing values were expected and which came from the mistake — that's what made the price recovery possible.

For area, the real conversion number for feet to meters was used, and the result was kept at the same precision as the original data, so the numbers don't look more exact than they really are.

## 3. Evidence

Nine fields in the working copy of the dataset were cleaned, always starting from an untouched raw backup table:

- **category** — casing and spacing fixed, 4 typos/translations mapped by hand, 16 blank values set to NULL instead of guessed.
- **date_collected** — 4 different date formats found, converted to a real date type only after confirming every row matched one of them.
- **id** — 21 duplicate rows fixed using a reliable database ID.
- **quantity** — bad values flagged, then the column converted to a number type.
- **price_eur** — bad values flagged, then converted to a number type. A wrong rule accidentally wiped the whole column; recovered using the raw backup.
- **notes** — broken text encoding fixed, extra spaces trimmed, blanks set to NULL.
- **missing coordinates** — checked against the original file, confirmed 8 rows never had coordinates. Left as is.
- **address** — a repeated double-space pattern fixed, capital letters standardized.
- **area** — mixed units (feet/meters) converted into one column; 19 rows with no unit flagged and left blank.

The dashboard for this competency uses three database views built from the cleaned data: category (6 groups, including "Blank"), quantity (169 present / 31 missing), area (181 present / 19 missing).

## 4. Quality and verification

- Every field's numbers were checked to add up to the full 200 records at each stage.
- Date formats were checked for full coverage — no unmatched rows — before converting the column type.
- Cleaning logic was tested as a read-only `SELECT` before any actual change was written.
- After the price recovery, the restored data was checked against what it should have looked like before the mistake happened.
- The missing-coordinates finding was double-checked against the original CSV file directly, not just the database.
- The dashboard's numbers come from live database views, so they can't quietly go out of date compared to the actual table.

## 5. Evidence boundaries

This shows I can fix several different kinds of data problems in one cleaning pass — inconsistent categories, mixed date formats, duplicate keys, invalid numbers, broken encoding, and mixed units — while testing changes before writing them, and recovering from a real mistake using a backup and a stable ID.

It doesn't yet show cleaning at a much larger scale, or with a live table other people are using at the same time. It also doesn't show automated or repeatable cleaning — everything here was done as separate, manually run steps, not a script. And it doesn't show checking fields against each other for consistency; each one was cleaned on its own.

The area field also shows a real gap: it was left off my initial list and only caught after I thought the competency was already finished. That's included here honestly, since it's part of how the work actually went.

## 6. Professional capability demonstrated

I can find and fix several different kinds of data problems in one pass, test changes safely before writing them, and recover from a mistake using a backup and a stable ID. I haven't yet done this at a larger scale, with automation, or checking fields against each other. A real gap happened with the area field, and it was caught and corrected rather than missed for good.