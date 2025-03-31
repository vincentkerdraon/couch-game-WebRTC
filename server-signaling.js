//this is draft code, only use for the POC.

const WebSocket = require( 'ws' )

const wss = new WebSocket.Server( { port: 8021 } )

// Store sessions and their associated clients
const sessions = new Map()

wss.on( 'connection', ( ws ) => {
    console.log( 'New client connected' )

    ws.on( 'message', ( message ) => {
        try {
            const parsedMessage = JSON.parse( message )
            const { type, role, sessionId, peerIdFrom, peerIdTo, content } = parsedMessage

            if ( !sessionId || !peerIdFrom ) {
                console.error( 'Invalid message: Missing sessionId or peerIdFrom' )
                return
            }

            switch ( role ) {
                case 'Host':
                    if ( type === 'init' ) {
                        handleInit( ws, role, sessionId, peerIdFrom )
                    } else {
                        handleHostMessage( ws, sessionId, peerIdFrom, peerIdTo, parsedMessage )
                    }
                    break

                case 'Controller':
                    handleControllerMessage( ws, sessionId, peerIdFrom, parsedMessage )
                    break

                default:
                    console.error( 'Unknown role:', role )
            }
        } catch ( error ) {
            console.error( 'Error parsing message:', error )
        }
    } )

    ws.on( 'close', () => {
        console.log( 'Client disconnected' )
        handleDisconnect( ws )
    } )
} )

console.log( 'WebSocket server is running on ws://0.0.0.0:8021' )

// Handle initialization messages for the host
function handleInit ( ws, role, sessionId, peerIdFrom ) {
    if ( !sessions.has( sessionId ) ) {
        sessions.set( sessionId, { host: null, controllers: new Map() } )
    }

    const session = sessions.get( sessionId )

    if ( role === 'Host' ) {
        if ( session.host ) {
            console.error( `Session ${ sessionId } already has a host` )
            ws.send( JSON.stringify( { type: 'error', message: 'Session already has a host' } ) )
            return
        }
        session.host = { ws, peerId: peerIdFrom }
        console.log( `Host registered for session ${ sessionId }` )
    }
}

// Handle messages from the host
function handleHostMessage ( ws, sessionId, peerIdFrom, peerIdTo, message ) {
    const session = sessions.get( sessionId )
    if ( !session ) {
        console.error( `Session ${ sessionId } not found` )
        ws.send( JSON.stringify( { type: 'error', message: `Session ${ sessionId } not found` } ) )
        return
    }

    if ( session.host && session.host.peerId === peerIdFrom ) {
        const targetController = session.controllers.get( peerIdTo )
        if ( targetController && targetController.readyState === WebSocket.OPEN ) {
            console.log( `Routing message from host to controller ${ peerIdTo }` )
            targetController.send( JSON.stringify( message ) )
        } else {
            console.error( `Controller ${ peerIdTo } not found or not connected` )
            ws.send( JSON.stringify( { type: 'error', message: `Controller ${ peerIdTo } not found or not connected` } ) )
        }
    } else {
        console.error( `Invalid host or session mismatch for session ${ sessionId }` )
        ws.send( JSON.stringify( { type: 'error', message: 'Invalid host or session mismatch' } ) )
    }
}

// Handle messages from controllers
function handleControllerMessage ( ws, sessionId, peerIdFrom, message ) {
    const session = sessions.get( sessionId )
    if ( !session ) {
        console.error( `Session ${ sessionId } not found` )
        ws.send( JSON.stringify( { type: 'error', message: `Session ${ sessionId } not found` } ) )
        return
    }

    // Register the controller if not already registered
    if ( !session.controllers.has( peerIdFrom ) ) {
        session.controllers.set( peerIdFrom, ws )
        console.log( `Controller registered for session ${ sessionId }, peerId: ${ peerIdFrom }` )
    }

    // Forward the message to the host
    if ( session.host && session.host.ws.readyState === WebSocket.OPEN ) {
        console.log( `Routing message from controller ${ peerIdFrom } to host` )
        session.host.ws.send( JSON.stringify( message ) )
    } else {
        console.error( `Host for session ${ sessionId } is not connected` )
        ws.send( JSON.stringify( { type: 'error', message: 'Host is not connected' } ) )
    }
}

// Handle client disconnection
function handleDisconnect ( ws ) {
    for ( const [ sessionId, session ] of sessions.entries() ) {
        if ( session.host && session.host.ws === ws ) {
            console.log( `Host disconnected from session ${ sessionId }` )
            sessions.delete( sessionId )
            return
        }

        for ( const [ peerId, controllerWs ] of session.controllers.entries() ) {
            if ( controllerWs === ws ) {
                console.log( `Controller ${ peerId } disconnected from session ${ sessionId }` )
                session.controllers.delete( peerId )
                return
            }
        }
    }
}