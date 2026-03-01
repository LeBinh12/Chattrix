import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { VideoCall } from '../components/LiveKit/VideoCall';
import { useVideoCall } from '../hooks/useVideoCall';
import { useRecoilValue } from 'recoil';
import { userAtom } from '../recoil/atoms/userAtom';

const VideoCallScreen = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const roomName = searchParams.get('room');

    // Get current user name from Recoil
    const user = useRecoilValue(userAtom);
    const participantName = user?.data.fullName || user?.data.username || "Guest";

    const { token, serverUrl, fetchToken, resetCall, loading, error } = useVideoCall();

    useEffect(() => {
        if (roomName && participantName && !token) {
            fetchToken(roomName, participantName);
        }
    }, [roomName, participantName, token, fetchToken]);

    const handleDisconnect = () => {
        resetCall();
        // Go back to previous page
        navigate(-1);
    };

    if (!roomName) return <div className="p-4 text-red-500">Room name is missing.</div>;
    if (loading) return <div className="flex items-center justify-center h-screen">Loading call...</div>;
    if (error) return <div className="flex items-center justify-center h-screen text-red-500">Error connecting to call.</div>;

    if (token && serverUrl) {
        return (
            <VideoCall
                token={token}
                serverUrl={serverUrl}
                onDisconnected={handleDisconnect}
            />
        );
    }

    return <div className="flex items-center justify-center h-screen">Initializing...</div>;
};

export default VideoCallScreen;
