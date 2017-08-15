class HTTPSE {

    constructor () {
        this.isReady = false
        db.ready().then(() => { this.isReady = true })

        // TODO: put server endpoint here
        // TODO: move db onupgradeneeded handler here (fetchUpdate)
        // TODO: move handleUpdate here
        // TODO: move debug/test here for now
        
        return this
    }  
}
