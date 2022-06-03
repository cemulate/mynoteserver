import * as url from 'url';
import cliOptions from './cli-options.mjs';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebpack from 'fastify-webpack-hmr';
import webpack from 'webpack';
import webpackConfig from '../webpack.config.js';

const server = fastify();

if (process.env.NODE_ENV && process.env.NODE_ENV == 'development') {
    const compiler = webpack({ ...webpackConfig, mode: 'development' });
    server.register(fastifyWebpack, { compiler });
} else {
    server.register(fastifyStatic, { root: __dirname + '/../dist', prefix: '/app/' });
}

server.get('/', async (request, reply) => {
    return reply.redirect('/app/');
});

import api from './api.mjs';
server.register(api);

server.listen(cliOptions.port, '0.0.0.0');
