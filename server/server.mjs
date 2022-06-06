#!/usr/bin/env node

import * as url from 'url';
import cliOptions from './cli-options.mjs';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

import fastify from 'fastify';
import fastifyStatic from '@fastify/static';

const server = fastify();

if (process.env.NODE_ENV && process.env.NODE_ENV == 'development') {
    const fastifyWebpack = await import('fastify-webpack-hmr');
    const { default: webpack } = await import('webpack');
    const { default: webpackConfig } = await import('../webpack.config.js');
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

server.listen(cliOptions.port, cliOptions.host);
