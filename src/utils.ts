import {randomUUID} from "crypto";
import {createClient, RedisClientType} from 'redis';

const https = require('https');
const fs = require('fs');

const imageUrl = 'https://example.com/image.jpg';
const imageName = 'image.jpg';


export async function downloadImage(imageUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const path = '/tmp/' + randomUUID() + '.' + imageUrl.split('.').pop()
        const file = fs.createWriteStream(path);

        https.get(imageUrl, (response: any) => {
            response.pipe(file);

            file.on('finish', () => {
                file.close();
                console.log(`Image downloaded as ${path}`);
                resolve(path);
            });
        }).on('error', (err: any) => {
            fs.unlink(imageName);
            console.error(`Error downloading image: ${err.message}`);
            reject(err.message);
        });
    });
}


