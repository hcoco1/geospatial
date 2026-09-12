# Competency 1

## What I am able to do

* Inspect an unfamiliar spatial dataset before processing or importing it.
* Identify the dataset structure, encoding, available fields, geometry status, coordinate fields, and spatial reference information.
* Determine whether coordinate information can be used as spatial geometry, and identify records with missing coordinates.
* Distinguish between the original data and changes introduced during data import.
* Perform a controlled import of spatial data into a PostGIS database while keeping the raw source data unchanged.
* Verify the imported dataset using record counts, geometry presence, spatial reference information, field types, and geometry validity.

## Professional knowledge

Spatial data should be inspected before processing, because problems with structure, coordinates, geometry, attributes, encoding, or spatial reference can affect later GIS operations.

Coordinate values and a defined coordinate reference system (CRS) are not the same thing. Coordinate values alone do not tell you the source CRS.

Assigning a CRS is also different from transforming coordinates. A CRS can be assigned to coordinates once the correct reference system is known, while reprojection changes the coordinate values to a different CRS.

## Evidence

The evidence shows the inspection of a CSV dataset with 200 records. The source was checked for encoding, layer structure, fields, coordinate information, geometry, and spatial reference.

The inspection found that:

* The source file is UTF-8 text.
* GDAL can open the CSV as a layer.
* Longitude and latitude can be read as point geometry for 192 records.
* Eight records have missing coordinate information and therefore no geometry after import.
* The source CRS is unknown.
* The imported spatial records use EPSG:4326 wherever geometry was created.
* The imported attributes remain text-based, without silent conversion or cleaning.
* The raw dataset was imported into a dedicated database table for further processing.

## Quality and verification

The imported data was checked against the source using record counts and coordinate availability.

The database contains 200 records:

* 192 records with geometry;
* 8 records without geometry;
* 192 valid geometries;
* 0 invalid geometries.

These counts match the original 200 records, confirming that no records were lost during import.

The source also contains attribute inconsistencies, such as differences in capitalisation, spelling, translation, and whitespace. These were identified during inspection but not corrected at this stage.

## Evidence boundaries

The evidence demonstrates practical capability in inspecting and importing a spatial CSV dataset, and in verifying the resulting database content.

It does not demonstrate that the original dataset had a known CRS. The source CRS was unknown, and EPSG:4326 was assigned during the controlled import, based on the intended interpretation of the longitude/latitude fields.

The evidence also does not demonstrate attribute cleaning. The inconsistencies identified here were left in place for later data-cleaning work.

## Professional capability demonstrated
!!! note ""
    The evidence demonstrates that I can **inspect an unfamiliar spatial dataset, identify key structural and spatial characteristics, perform a controlled spatial import, and verify that the resulting data is complete and consistent before further processing**.