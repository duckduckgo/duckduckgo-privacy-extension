import utils from './utils.es6'
import tldts from 'tldts'
import { Trackers } from '@duckduckgo/privacy-grade'
const trackersInstance = new Trackers({ tldjs: tldts, utils })
export default trackersInstance
