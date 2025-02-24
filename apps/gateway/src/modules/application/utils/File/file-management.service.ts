import * as fs from "fs";
// import * as read from "read-file";

import { extname } from "path";
import JSZip from "jszip";

const moment = require('moment-timezone');

function copyFiletoInternal(dir: string, origin_file: string, prefix: string) {
  try {
    const curr_date = new Date().toISOString().split('T');
    const destination_file = `${prefix}.${curr_date[0]}.${curr_date[1]}${extname(origin_file)}`;

    // Process copy file
    fs.copyFileSync(dir + origin_file, dir +"processed/"+ destination_file);
    fs.copyFileSync(dir + origin_file, dir +"archived/"+ origin_file);
    fs.rmSync(dir + origin_file);

    console.info(`${origin_file} was copied to ${destination_file}`);

    return {
      origin_file, destination_file
    }
  } catch (error) {
    console.log('Failed copyFiletoInternal : ', error)
    return {
      origin_file, destination_file : ''
    }
  }

}

/**
 * read One File on folder
 * @param dirname 
 * @param filename 
 * @returns 
 * @deprecated
 */
function readOneFile(dirname: string, filename: string) {
  console.log(`${dirname}${filename}`);
  try {
    const data = readCSV(dirname + filename);
    return { filename, data };
  } catch (error) {
    console.log('Failed readOneFile : ', error)
    return {filename, data : []};
  }
}

/**
 * service read file csv
 * @param filedir position folder
 * @returns 
 * @deprecated
 */
function readCSV(filedir: string) {
  // const content = read.sync(filedir, 'utf-8')
  const content = fs.readFileSync(filedir, 'utf8')
  let array = content.split("\n");

  let result = [];

  // The array[0] contains all the
  // header columns so we store them
  // in headers array
  let headers = array[0].split("|")

  // Since headers are separated, we
  // need to traverse remaining n-1 rows.
  for (let i = 1; i < array.length - 1; i++) {
    let obj = {}

    // Create an empty object to later add
    // values of the current row to it
    // Declare string str as current array
    // value to change the delimiter and
    // store the generated string in a new
    // string s
    let str = array[i]
    let s = ''

    // By Default, we get the comma separated
    // values of a cell in quotes " " so we
    // use flag to keep track of quotes and
    // split the string accordingly
    // If we encounter opening quote (")
    // then we keep commas as it is otherwise
    // we replace them with pipe |
    // We keep adding the characters we
    // traverse to a String s
    let flag = 0
    for (let ch of str) {
      if (ch === '"' && flag === 0) {
        flag = 1
      }
      else if (ch === '"' && flag == 1) flag = 0
      if (ch === ', ' && flag === 0) ch = '|'
      if (ch !== '"') s += ch
    }

    // Split the string using pipe delimiter |
    // and store the values in a properties array
    let properties = s.split("|")

    // For each header, if the value contains
    // multiple comma separated data, then we
    // store it in the form of array otherwise
    // directly the value is stored
    if (properties[0] !== '') {
      for (let j in headers) {
        if (properties[j].includes(", ")) {
          obj[headers[j].toLowerCase().replace("\\r", "")] = properties[j]
            .split(", ").map(item => item.trim().replace("\\r", ""))
        }
        else {
          obj[headers[j].toLowerCase().replace("\\r", "")] = properties[j].replace("\\r", "");
        }
      }

      // Add the generated object to our
      // result array
      result.push(obj)
    }
  }

  return result;
}

function scanFilesOndir(dirname: string, has_been_processed: string[]) {
  const filenames = fs.readdirSync(dirname)
  const json = [];
  filenames.forEach(function (filename) {
    if (!has_been_processed.includes(filename)) {
      const data = readCSV(dirname + filename);
      json.push({ filename, data });
    }
  });

  return json;
}

/**
 * Function for scan file csv on directory
 * @param dirname name of directory
 * @param has_been_processed validate file to exclude scan
 * @returns string[]
 */
function scanFilesOndirOnlyCsv(dirname: string, has_been_processed: string[]): string[] {
  const filenames = fs.readdirSync(dirname);
  const files = [];

  filenames.forEach(function (filename) {
    if (!has_been_processed.includes(filename) && extname(filename) === ".csv") {
      const filePath = `${dirname}/${filename}`;
      const fileStat = fs.statSync(filePath);
      files.push({ filename, mtime: fileStat.mtime });
    }
  });

  // Sort the files by modification time (mtime) in ascending order (oldest first)
  files.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

  // Return only the filenames
  return files.map(file => file.filename);
}

/**
 * Function for scan file csv on directory
 * @param dirname name of directory
 * @param has_been_processed validate file to exclude scan
 * @returns string[]
 * @deprecated
 */
function scanFilesOndirOnlyCsvOld(dirname: string, has_been_processed: string[]) : string[] {
  const filenames = fs.readdirSync(dirname)
  const files = [];
  filenames.forEach(function (filename) {
    if (!has_been_processed.includes(filename) && extname(filename) === ".csv") {
      files.push(filename);
    }
  });

  return files;
}

/**
 * Function for scan file with specific type on directory
 * @param dirname name of directory
 * @param type file type (extension)
 * @param has_been_processed validate file to exclude scan
 * @returns string[]
 */
function scanFilesSpecificTypeOndir(dirname: string, type: string, has_been_processed: string[]) : string[] {
  const filenames = fs.readdirSync(dirname)
  const files = [];
  filenames.forEach(function (filename) {
    if (!has_been_processed.includes(filename) && extname(filename) === `.${type}`) {
      files.push(filename);
    }
  });

  return files;
}

/**
 * Function for copy file to archived and compress, and move to processed
 * @param dir
 * @param origin_file
 * @param prefix
 */
async function copyFileToInternalAndCompress(dir: string, origin_file: string, prefix: string) {
  // const curr_date = new Date().toISOString().split('T');
  // const destination_file = `${prefix}.${curr_date[0]}.${curr_date[1]}${extname(origin_file)}`;
  const destination_file = `${prefix}.${moment().format('YYYY-MM-DD')}.${moment().format('HH-mm-ss.SSS[Z]')}${extname(origin_file)}`;

  const compress = await compressFile(dir, origin_file);
  const processedPath = dir + "processed/";
  const archivedPath = dir + "archived/";

  if (!fs.existsSync(processedPath)) {
    fs.mkdirSync(processedPath);
  }

  if (!fs.existsSync(archivedPath)) {
    fs.mkdirSync(archivedPath);
  }

  // Process copy file
  fs.copyFileSync(dir + origin_file, processedPath + destination_file);
  fs.copyFileSync(dir + compress, archivedPath + compress);
  fs.rmSync(dir + origin_file);
  fs.rmSync(dir + compress);

  console.info(`${origin_file} was copied to ${destination_file}`);

  return {
    origin_file, destination_file
  }
}

/**
 * Function for copy file to archived and compress, and move to processed
 * @param dir
 * @param origin_file
 * @param timestamp
 */
async function copyFileToArchivedAndCompress(dir: string, origin_file: string, timestamp: boolean = false) {
  const compress = await compressFile(dir, origin_file);
  let archived = compress;
  if (timestamp) {
    const timestamp = "." + new Date().toISOString();
    const indexExtension = compress.lastIndexOf(".");
    archived = [compress.slice(0, indexExtension), timestamp, compress.slice(indexExtension)].join('');
  }

  // Process copy file
  fs.copyFileSync(dir + compress, dir +"archived/"+ archived);
  fs.rmSync(dir + compress);
  fs.rmSync(dir + origin_file);

  console.info(`${origin_file} was archived at ${archived}`);

  return origin_file;
}

/**
 * Function for compress file
 * @param dir
 * @param fileName
 */
async function compressFile(dir: string, fileName: string): Promise<string> {
  const Jszip  = require('jszip');
  const zip = new Jszip();
  const fullPath = dir + fileName;

  // Make a new folder according to the filename
  const fileZip = zip.folder(fileName);
  fileZip.file(fileName, fs.readFileSync(fullPath), {
    base64: true
  });

  const generatedZip = await zip.generateAsync({ type: "nodebuffer" });
  const zipFile = `${fileName}.zip`;
  fs.writeFileSync(dir + zipFile, generatedZip);

  return zipFile;
}

async function checkExistingFile(fileDir: string): Promise<boolean> {
  return fs.existsSync(fileDir);
}

/**
 * Service for read file csv
 * @param dirname 
 * @param filename 
 * @returns 
 */
async function readOneFileAsync(dirname: string, filename: string) {
  console.log(`${dirname}${filename}`);
  try {
    const data = await readCsvFileAsyn(dirname + filename);
    return { filename, data };
  } catch (error) {
    console.log('Failed readOneFile : ', error)
    return {filename, data : []};
  }
}

/**
 * Service for read content file csv
 * @param filedir 
 * @returns 
 */
async function readCsvFileAsyn(filedir: string) {
  // const content = read.sync(filedir, 'utf-8')
  const csv = fs.readFileSync(filedir, 'utf8').replace(/\r/g, '');
  const lines = csv.split('\n');
    const result = [];
    const headers = lines[0].split('|');
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue; // Skip empty lines

        const obj = {};
        const currentLine = lines[i].split('|');
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j].toLowerCase().replace("\\r", "").replace(/\s+/g, '')] = currentLine[j].replace("\\r", "").replace(/\s+/g, '');
        }
        result.push(obj);
    }
    return result;
}

export {
  checkExistingFile,
  compressFile,
  copyFileToArchivedAndCompress,
  copyFiletoInternal,
  copyFileToInternalAndCompress,
  readOneFile,
  scanFilesOndir,
  scanFilesOndirOnlyCsv,
  scanFilesSpecificTypeOndir,
  readOneFileAsync,
  readCsvFileAsyn
};
