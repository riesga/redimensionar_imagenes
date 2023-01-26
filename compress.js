const fs = require('fs');
const archiver = require('');

const sourceFolder = 'D:\\copias-s3';

fs.readdir(sourceFolder, (err, files) => {
    if (err) throw err;
    for (const file of files) {
        if (file.endsWith('.pdf')) {
            const filePath = `${sourceFolder}/${file}`;
            const destination = `${filePath.slice(0,-4)}.zip`;
            if(fs.existsSync(destination)) {
                console.log(`${destination} already compressed, skipping`)
                continue;
            }
            fs.stat(filePath, function(err, stats) {
                if (err) {
                    console.log(err);
                } else {
                    var mtime = new Date(stats.mtime);
                    var currentDate = new Date();
                    var difference = currentDate - mtime;
                    var daysDifference = difference / 1000 / 60 / 60 / 24;
                    if (daysDifference > 2) {
                        fs.unlink(filePath, (err) => {
                            if (err) throw err;
                            console.log(`${filePath} deleted`);
                        });
                    } else {
                        const output = fs.createWriteStream(destination);
                        const archive = archiver('zip', { zlib: { level: 9 } });
                        output.on('close', function() {
                            console.log(archive.pointer() + ' total bytes');
                            console.log('archiver has been finalized and the output file descriptor has closed.');
                        });

                        output.on('end', function() {
                            console.log('Data has been drained');
                        });

                        archive.on('warning', function(err) {
                            if (err.code === 'ENOENT') {
                                console.log("Archive warning: " + err);
                            } else {
                                throw err;
                            }
                        });

                        archive.on('error', function(err) {
                            throw err;
                        });

                        archive.pipe(output);
                        archive.file(filePath, { name: file });
                        archive.finalize();
                    }
                }
            });
        }
    }
});
