import {
    LiveKitRoom,
    VideoConference,
    RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';
import type { RoomOptions } from 'livekit-client';
import { VideoPresets, ConnectionQuality } from 'livekit-client';

interface VideoCallProps {
    token: string;
    serverUrl: string;
    onDisconnected?: () => void;
}

const roomOptions: RoomOptions = {
    // Adaptive streaming: auto-adjust video quality based on subscriber viewport size
    adaptiveStream: true,
    // Dynacast: only send video layers that at least one subscriber needs
    dynacast: true,
    // Video publish defaults
    videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
    },
    publishDefaults: {
        // Simulcast: publish multiple quality layers so subscribers pick the best one
        simulcast: true,
        videoSimulcastLayers: [
            VideoPresets.h90,
            VideoPresets.h216,
        ],
        screenShareSimulcastLayers: [
            VideoPresets.h360,
            VideoPresets.h720,
        ],
        // Prefer VP8 for broader compatibility
        videoCodec: 'vp8',
        // Limit screen share to 1080p / 15fps to save bandwidth
        screenShareEncoding: {
            maxBitrate: 3_000_000,
            maxFramerate: 15,
        },
    },
    // Reconnect policy
    reconnectPolicy: {
        nextRetryDelayInMs: (context) => {
            // Retry up to 10 times with exponential backoff, max 30s
            if (context.retryCount > 10) return null;
            return Math.min(300 * Math.pow(2, context.retryCount), 30_000);
        },
    },
    disconnectOnPageLeave: true,
};

export const VideoCall = ({ token, serverUrl, onDisconnected }: VideoCallProps) => {
    return (
        <LiveKitRoom
            connect={true}
            video={true}
            audio={true}
            token={token}
            serverUrl={serverUrl}
            onDisconnected={onDisconnected}
            onError={(err) => {
                console.error("LiveKit Room Error:", err);
            }}
            options={roomOptions}
            data-lk-theme="default"
            style={{ height: '100%', width: '100%' }}
        >
            <VideoConference />
            <RoomAudioRenderer />
        </LiveKitRoom>
    );
};
