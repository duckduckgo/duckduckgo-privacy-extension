import { checksum } from "../../../shared/js/background/storage/https";
import httpsBloom from './../../data/httpsBloom.json'

describe('legacy checksum', () => {
    it('calculates the sha256 checksum of data', async () => {
        expect(await checksum('test')).toEqual('ZheqiKcua1JriMvO2jiKe1Kg6FYUihLZuEKc0qU6PqQ=')
    })

    it('correctly calculates the checksum of a bloom filter', async () => {
        expect(await checksum(httpsBloom.data)).toEqual(httpsBloom.checksum.sha256)
    })
})