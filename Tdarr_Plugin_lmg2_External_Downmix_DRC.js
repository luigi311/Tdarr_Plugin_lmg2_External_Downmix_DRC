
const fs = require('fs');

module.exports.details = function details() {
  return {
    id: 'Tdarr_Plugin_lmg2_External_Downmix_DRC',
    Stage: 'Pre-processing',
    Name: 'Downmix multichannel track to stereo with Dynamic Range Compression',
    Type: 'Audio',
    Operation: 'Transcode',
    Description: 'This plugin downmixes multichannel audio to stereo while applying Dynamic Range Compression \n'
      + ' removing the need to constantly raise and lower the volume if they are talking or an explosion is occuring ',
    Version: '1.00',
    Link: '',
    Tags: 'pre-processing,audio only,ffmpeg,configurable',
    Inputs: [
        {
            name: 'title',
            tooltip:`What should the title of the audio be?
            \nExmaple:\n
            Eng DRC` 
        },
        {
            name: 'container',
            tooltip:`What should the container be?
            \nExample:\n
            mka`
        },
        {
            name: 'audio_codec',
            tooltip: `What codec do you want to use?
            \nExample:\n
            aac`
        },
        {
            name: 'bitrate',
            tooltip: `What bitrate should we use?
            \nExample:\n
            192k
            `,
        },
        {
            name: 'compression_ratio',
            tooltip: `What do you want as the compression ratio?
            \nExample:\n
            4
            `,
        },        
    ],
  };
};

module.exports.plugin = function plugin(file, librarySettings, inputs) {
  // Must return this object at some point in the function else plugin will fail.

    if (inputs.title === undefined) {
        title = 'Stereo-DRC'
    } else {
        title = inputs.title;
    }

    if (inputs.container === undefined) {
        container = 'mka'
    } else {
        container = inputs.container
    }

    if (inputs.audio_codec === undefined) {
        audio_codec = 'aac'
    } else {
        audio_codec = inputs.audio_codec
    }

    if (inputs.bitrate === undefined) {
        bitrate = '192k'
    } else {
        bitrate = inputs.bitrate
    }

    if (inputs.compression_ratio === undefined) {
        compression_ratio = 4
    } else {
        compression_ratio = inputs.compression_ratio
    }

    const response = {
        processFile: true,
        preset: '',
        container: `.${file.container}`,
        handBrakeMode: false,
        FFmpegMode: true,
        reQueueAfter: true,
        infoLog: '',
    };

    const audioArr = file.ffProbeData.streams.filter((row) => row.channels > 2);

    if (audioArr.length === 0) {
        response.infoLog += 'No multichannel audio to downmix\n';
        response.processFile = false;
        return response;
    }
    response.infoLog += 'Found audio to extract!\n';

    let command = '-y,';
    for (let i = 0; i < audioArr.length; i += 1) {
        const audiostream = audioArr[i];
        let lang = '';
        //Split on space and .
        let titleFile = title.split(/[\s.]/);
        titleFile = titleFile.join('-');

        if (audiostream.tags) {
            lang = audiostream.tags.language;
        }
        
        let audioFile = file.file;
        audioFile = audioFile.split('.');
        audioFile[audioFile.length - 2] += `.${lang}.${titleFile}`;
        audioFile[audioFile.length - 1] = `${container}`;
        audioFile = audioFile.join('.');

        const { index } = audiostream;
        if (fs.existsSync(`${audioFile}`)) {
            response.infoLog += `${lang}.${titleFile}.${container} already exists. Skipping!\n`;
        } else if (title.toLowerCase().includes('commentary') || title.toLowerCase().includes('description')) {
            response.infoLog += `Stream ${i} ${lang}.srt is a ${title} track. Skipping!\n`;
        } else {
            response.infoLog += `Extracting ${lang}.${titleFile}.${container}\n`;
            command += ` -map 0:${index} -c:a:0 ${audio_codec} -ac 2 -filter:a:0 "acompressor=ratio=${compression_ratio}" -b:a:0 ${bitrate} -metadata:s:a:0 title="${title}" -metadata:s:a:0 language="${lang}" "${audioFile}"`;
        }
    }

    if (command === '-y,') {
        response.infoLog += 'All audios already extracted!\n';
        response.processFile = false;
        return response;
    }

    response.preset = command;

    return response;
};