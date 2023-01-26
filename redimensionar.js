const fs = require('fs');
const sharp = require('sharp');
const path = require('path');

const folderPath = 'C:\\fotos';
const height = 200; // Altura esperada
const dateThreshold = new Date('2022-01-01'); // Fecha límite

fs.readdir(folderPath, (err, files) => {
  if (err) {
    console.error(err);
    return;
  }

  files.forEach((file) => {
    if (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.PNG') || file.endsWith('.JPG')) {
      const filePath = path.join(folderPath, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(err);
          return;
        }
        if (stats.mtime > dateThreshold) {
          const tempFile = `${folderPath}/temp-${file}`;

          fs.copyFile(filePath, tempFile, (err) => {
            if (err) {
              console.error(err);
              return;
            }
            sharp(tempFile).metadata()
              .then(function (metadata) {
                if (metadata.height >= height) {
                  sharp(tempFile)
                    .resize(null, height)
                    .withMetadata()
                    .toFile(filePath, (err, info) => {
                      if (err) {
                        console.error(err);
                      } else {
                        fs.unlink(tempFile, (err) => {
                          if (err) {
                            console.error(err);
                          } else {
                            console.log(`Successfully resized ${file}`);
                          }
                        });
                      }
                    });
                } else {
                  console.log(`${file} is already ${height}px height`);
                  fs.unlink(tempFile, (err) => {
                    if (err) {
                      console.error(err);
                    }
                  });
                }
              })
              .catch(function (err) {
                console.log(err);
              });
          });
        } else {
          console.log(`${file} is older than ${dateThreshold}, skipping...`);
        }
      });
    }
  });
});
