# Evidence: Competency 1

## Purpose

This page documents the inspection and controlled import of the source dataset [`dirty_sites_nl_v2.csv`](data/dirty_sites_nl_v2.csv "Download!").

I used this workflow to work out the source structure, encoding, available geometry information, coordinate characteristics, attribute types, record count, and data-quality issues, before and after importing the data into PostgreSQL/PostGIS.

The source data was imported as a raw dataset, with no cleaning or attribute type conversion at this stage.

---

## 1. Source encoding

I checked the source file encoding before looking at the CSV contents.

![GDAL](/Technical Evidence/01 — Data sourcing & inspection/screenshots/bash-1.png)

### Finding

The source file is UTF-8 text.

---

## 2. Initial source inspection

I opened the CSV with GDAL using the CSV driver.

![GDAL](/Technical Evidence/01 — Data sourcing & inspection/screenshots/bash-2.png)

### Finding

GDAL opened the source without issue and found one layer:

`dirty_sites_nl_v2`

At this stage, the layer had no native geometry.

---

## 3. Baseline layer inspection

I inspected the source layer without specifying coordinate fields.

![GDAL](/Technical Evidence/01 — Data sourcing & inspection/screenshots/bash-3.png)

### Findings

The baseline inspection showed:

- 200 source records.
- No native geometry.
- No CRS defined in the source layer.
- The attribute fields were initially read as strings.
- The longitude and latitude fields were also read as strings in the baseline inspection.

This gave me the initial state of the source before coordinate interpretation.

---

## 4. Coordinate and geometry inspection

I explicitly identified the longitude and latitude fields as the possible X and Y coordinate fields.
![GDAL](/Technical Evidence/01 — Data sourcing & inspection/screenshots/bash-4.png)

### Findings

When I used the coordinate fields as X and Y:

- GDAL read the dataset as point geometry.
- The layer contained 200 features.
- The coordinate extent was `5.050024, 52.051135` to `5.199666, 52.129648`.
- Longitude and latitude were read as numeric values for this inspection.
- The source CRS was still unknown.

The coordinate values are consistent with geographic longitude/latitude coordinates. The numeric range alone doesn't prove the original datum or CRS.

---

## 5. CRS inspection

I checked the source CRS separately.

![GDAL](/Technical Evidence/01 — Data sourcing & inspection/screenshots/bash-5.png)

### Finding

No CRS was defined in the source CSV at the time of inspection.

The source coordinates were later assigned EPSG:4326 during import. This was a CRS assignment, not a reprojection.

---

## 6. Record-count verification with GDAL SQL

I also checked the source record count using GDAL SQL.

![GDAL](/Technical Evidence/01 — Data sourcing & inspection/screenshots/bash-6.png)

### Finding

The SQL count confirms the source contains 200 records.

---

## 7. Identification of records with missing coordinates

I queried the source using the coordinate interpretation described above to find records where longitude is NULL.

![GDAL](/Technical Evidence/01 — Data sourcing & inspection/screenshots/bash-7.png)



### Finding

Eight source records have missing longitude values, so they can't provide a complete X/Y coordinate pair for point geometry construction.

This finding matches the later PostGIS result showing eight records without geometry.

---

## 8. Controlled import to PostgreSQL/PostGIS

I imported the source dataset into PostgreSQL/PostGIS using `ogr2ogr`.

![GDAL](/Technical Evidence/01 — Data sourcing & inspection/screenshots/bash-8.png)

### Import controls

The documented import command:

- uses the PostgreSQL driver;
- constructs point geometry from the longitude and latitude fields;
- assigns EPSG:4326 to the resulting geometry;
- explicitly selects the source attributes to transfer;
- stores the result in `raw.sites_nl_dirty`.

I didn't include the longitude and latitude columns in the selected attributes, since they were used to construct the point geometry.

`-a_srs EPSG:4326` assigns a CRS to the imported geometry. It doesn't transform the coordinates.

This was a controlled raw import, not a cleaning operation.

### Evidence status

The import command is documented as part of the project workflow. The PostGIS queries below independently verify its resulting database state.

No real database credentials are included in this public evidence.

---

## 9. PostGIS record-count verification

I checked the number of records in the imported table in PostgreSQL.

```sql
SELECT COUNT(*)
FROM raw.sites_nl_dirty;

 count 
-------
   200
(1 row)
```

### Finding

The PostGIS table contains 200 records, matching the source record count.

---

## 10. PostGIS SRID verification

I inspected the geometry SRIDs.

```sql
SELECT DISTINCT ST_SRID(wkb_geometry)
FROM raw.sites_nl_dirty;

st_srid
-------

4326
```

Two distinct results came back:

- `NULL`
- `4326`

### Finding

The imported dataset contains geometries with SRID 4326 and records with NULL geometry.

---

## 11. Verification of records without geometry

I checked the number of records with NULL geometry directly.

```sql
SELECT COUNT(*)
FROM raw.sites_nl_dirty
WHERE wkb_geometry IS NULL;

count
-----
8
```

### Finding

Eight imported records have no geometry.

This matches the eight source records the GDAL query flagged with missing longitude.

---

## 12. Verification of geometries with SRID 4326

I checked the number of geometries carrying SRID 4326 separately.

```sql
SELECT COUNT(*)
FROM raw.sites_nl_dirty
WHERE ST_SRID(wkb_geometry) = 4326;

count
-----
192
```

### Reconciliation

```text
192 records with SRID 4326
+ 8 records with NULL geometry
= 200 records
```

This matches both the source and PostGIS record counts.

---

## 13. PostGIS attribute-type inspection

I checked the imported attribute types through PostgreSQL metadata.

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sites_nl_dirty';

  column_name   |     data_type     
----------------+-------------------
 ogc_fid        | integer
 id             | character varying
 address        | character varying
 category       | character varying
 quantity       | character varying
 area           | character varying
 price_eur      | character varying
 date_collected | character varying
 notes          | character varying
 wkb_geometry   | USER-DEFINED
(10 rows)
```


### Finding

Several fields that could potentially represent numeric or date values remain stored as `character varying`.

I didn't perform any type conversion during this raw import stage.

---

## 14. Geometry validity verification

I checked geometry validity in PostGIS, only for records that have geometry.

```sql
SELECT
    COUNT(*) AS invalid_geometries
FROM raw.sites_nl_dirty
WHERE wkb_geometry IS NOT NULL
  AND NOT ST_IsValid(wkb_geometry);

invalid_geometries
------------------
0
```

Then I checked the number of valid geometries:

```sql
SELECT
    COUNT(*) AS valid_geometries
FROM raw.sites_nl_dirty
WHERE wkb_geometry IS NOT NULL
  AND ST_IsValid(wkb_geometry);

valid_geometries
----------------
192
```

I ran a further query to find invalid geometry reasons:

```sql
SELECT
    id,
    ST_IsValidReason(wkb_geometry) AS validity_reason
FROM raw.sites_nl_dirty
WHERE wkb_geometry IS NOT NULL
  AND NOT ST_IsValid(wkb_geometry);

0 row(s) fetched.
```

### Finding

All 192 imported records that contain geometry pass the PostGIS `ST_IsValid` check.

There are no invalid geometries among the 192 records with geometry.

---

## 15. Failed geometry-validity attempt in GDAL

I made an earlier attempt in GDAL to check geometry validity using SQLite SQL:

```bash
ogrinfo \
  dirty_sites_nl_v2.csv \
  -dialect SQLite \
  -sql "SELECT COUNT(*)
        FROM dirty_sites_nl_v2
        WHERE ST_IsValid(geometry) = 0"


ERROR 1: In ExecuteSQL(): sqlite3_prepare_v2(): no such column: geometry
```

### Interpretation

This query failed because the CSV layer didn't expose a column named `geometry` for that query.

I'm not using this failed attempt as evidence of geometry validity.

The validity result reported above comes from the successful PostGIS checks.

---

## 16. Inspection findings relevant to later cleaning

The inspection also turned up examples of inconsistent attribute values.

Examples from the source records include:

- `hospitaal`
- `warehouse ` — trailing whitespace
- `PARK` — different capitalization
- `parc`
- `retail`

One address also has surrounding whitespace:

```text
  Dorpsstraat 196
```

These observations flag attribute-quality issues to address during the data-cleaning stage.

I didn't do any normalization or cleaning as part of this inspection evidence.

---

## 17. Evidence summary

| Area                             | Verified result                                |
| -------------------------------- | ---------------------------------------------- |
| Source format                    | CSV                                            |
| Encoding                         | UTF-8                                          |
| Source layer                     | `dirty_sites_nl_v2`                            |
| Source records                   | 200                                            |
| Initial geometry                 | None                                           |
| X/Y interpretation               | Point                                          |
| Source CRS                       | Unknown                                        |
| Coordinate extent                | `5.050024, 52.051135` to `5.199666, 52.129648` |
| Records with missing longitude   | 8                                              |
| Imported records                 | 200                                            |
| Records with SRID 4326           | 192                                            |
| Records without geometry         | 8                                              |
| Valid geometries                 | 192                                            |
| Invalid geometries               | 0                                              |
| Selected source attributes       | 8                                              |
| Several imported attribute types | `character varying`                            |

---

## 18. Data exploration dashboard (QGIS)

I built a QGIS print-layout dashboard from the raw imported dataset to visually pull together the findings from Sections 3, 4, 7, 16, and 17.

![QGIS dashboard](additional/dashboard_QGIS.png)

[Download the full-resolution dashboard (PDF)](additional/dashboard_QGIS.pdf "Download!")

### Findings

Using QGIS directly on the raw imported layer, the dashboard confirms:

- 200 total records, 192 mapped, 8 with missing geometry — matching the GDAL and PostGIS counts above.
- The layer CRS is reported as EPSG:4326 (WGS 84), consistent with the CRS assigned during import.
- The `category` field contains at least 26 visually distinct raw values, consistent with the attribute-quality issues in Section 16.
- The `quantity` and `area` fields contain a mix of numeric, non-numeric, and missing values, consistent with these fields still being stored as `character varying` (Section 13).

### Evidence status

I built this dashboard directly from the raw, pre-cleaning dataset in QGIS. It's a visual cross-check of findings already established through GDAL and PostGIS, not a new or separate verification method.

---

## Evidence boundaries

This evidence demonstrates practical capability in inspecting a spatial CSV, interpreting coordinate fields, identifying missing coordinate data, checking source structure and types, performing a controlled import into PostGIS, and verifying the imported result.

The evidence doesn't demonstrate that:

- the original source CRS was definitively EPSG:4326;
- the source attributes were cleaned or normalized;
- string attributes were converted to appropriate numeric or date types;
- the eight missing coordinates were repaired;
- the imported data was corrected after inspection.

EPSG:4326 was assigned during the import workflow. The source inspection itself reported the CRS as unknown.

The geometry validity result applies to the 192 records that contain geometry. It doesn't establish validity for the eight records without geometry.

I'm keeping the failed GDAL geometry-validity query as part of the technical audit, but I'm not treating it as successful evidence.

## Technical capability demonstrated

This evidence demonstrates the ability to:

- inspect an unfamiliar spatial CSV before loading it into a spatial database;
- identify its structure, encoding, record count, coordinate fields, and CRS state;
- use GDAL to interpret longitude and latitude as point geometry;
- identify records that can't produce geometry because coordinate information is missing;
- perform a controlled raw import into PostgreSQL/PostGIS;
- verify record counts, geometry presence, SRIDs, and attribute data types after import;
- perform geometry validity checks using PostGIS;
- reconcile source and database results to verify that the complete 200-record dataset is accounted for.

The evidence supports **demonstrated hands-on capability in data sourcing and inspection**. Data cleaning and correction are outside the scope of this evidence.
