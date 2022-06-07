import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';

const options = commandLineArgs([
    { name: 'help' },
    { name: 'host', alias: 'h', type: String, defaultValue: '127.0.0.1' },
    { name: 'port', alias: 'p', type: Number, defaultValue: 8080 },
    { name: 'directory', alias: 'd', type: String },
]);

const usage = commandLineUsage([
    {
        header: 'Options',
        optionList: [
            {
                name: 'directory',
                alias: 'd',
                typeLabel: '{underline path}',
                description: 'The root directory to serve and store notes from',
            },
            {
                name: 'host',
                alias: 'h',
                typeLabel: '{underline string}',
                description: '(default: 127.0.0.1) The IP address to listen on',
            },
            {
                name: 'port',
                alias: 'p',
                typeLabel: '{underline int}',
                description: '(default: 8080) The port to listen on',
            },
        ],
    },
]);

export { options, usage };
