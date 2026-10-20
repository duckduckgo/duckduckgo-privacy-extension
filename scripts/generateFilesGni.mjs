/** Writes files.gni into a chromium-embedded build directory. */
import { writeFilesGni } from './build-tools/lib/filesGni.mjs';

writeFilesGni(process.argv[2]);
