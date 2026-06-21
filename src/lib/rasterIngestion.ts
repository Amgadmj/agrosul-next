import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';

const execAsync = promisify(exec);

// Initialize PostgreSQL connection pool
// Requires: npm install pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Automates the ingestion of a pilot-uploaded GeoTIFF DEM into PostGIS.
 * 
 * @param tempTiffPath The temporary path where the uploaded .tif is saved
 * @param regionName The name of the field/region being surveyed
 */
export async function processUploadedDem(tempTiffPath: string, regionName: string) {
  // Use a unique staging table name to prevent collisions if multiple pilots upload at once
  const stagingTable = `staging_dem_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const tempSqlPath = path.join(process.cwd(), 'tmp', `${stagingTable}.sql`);
  
  try {
    console.log(`[DEM Ingestion] Starting automated pipeline for region: ${regionName}`);

    // Ensure our tmp directory exists for the intermediate SQL
    await fs.mkdir(path.dirname(tempSqlPath), { recursive: true });

    // 1. Generate the SQL using raster2pgsql
    // We pipe the output directly to a file because raster SQL files can be gigabytes in size,
    // which would crash Node.js if kept entirely in memory.
    const rasterCommand = `raster2pgsql -s 4326 -I -C -M -t 100x100 -f dem_raster ${tempTiffPath} public.${stagingTable}`;
    
    console.log(`[DEM Ingestion] Slicing GeoTIFF into tiles...`);
    // Increase maxBuffer in case stderr is chatty
    await execAsync(`${rasterCommand} > ${tempSqlPath}`, { maxBuffer: 1024 * 1024 * 10 });

    // 2. Execute the staging SQL into the database using psql
    // Using psql CLI here because the 'pg' library struggles with hundreds of megabytes of raw SQL
    console.log(`[DEM Ingestion] Loading raster tiles into staging database table...`);
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL environment variable is missing.");
    
    await execAsync(`psql "${dbUrl}" -f ${tempSqlPath}`);

    // 3. Transactional migration from Staging to Main Table
    console.log(`[DEM Ingestion] Stamping tiles with region name and migrating to master table...`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Move data from the temporary staging table into our production table
      const insertQuery = `
        INSERT INTO digital_elevation_hydrology (region_name, dem_raster)
        SELECT $1, dem_raster
        FROM ${stagingTable};
      `;
      await client.query(insertQuery, [regionName]);
      
      // Cleanup the staging table
      await client.query(`DROP TABLE ${stagingTable};`);
      await client.query('COMMIT');
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

    console.log(`[DEM Ingestion] Pipeline completed successfully for ${regionName}!`);
    return { success: true, region: regionName };
    
  } catch (error) {
    console.error('[DEM Ingestion] Fatal error during pipeline:', error);
    // Cleanup staging table on failure if it exists
    await pool.query(`DROP TABLE IF EXISTS ${stagingTable};`).catch(() => {});
    throw error;
  } finally {
    // 4. Always cleanup local temporary files (the uploaded TIFF and the generated SQL)
    await fs.unlink(tempTiffPath).catch(() => {});
    await fs.unlink(tempSqlPath).catch(() => {});
  }
}
