# Call System Sound Files

This directory contains sound files for the WebRTC calling system.

## Required Files:

- `ringtone.mp3` - Ringtone played for incoming calls (should loop)
- `call-notification.mp3` - Notification sound for call events

## File Requirements:

- **Format**: MP3 (best browser compatibility)
- **Duration**: 
  - Ringtone: 2-4 seconds (will loop)
  - Notification: 0.5-1 second (plays once)
- **Volume**: Normalized to prevent audio clipping
- **Bitrate**: 128kbps recommended

## Sound Attribution:

Replace with appropriate royalty-free sounds or licensed audio files.
Current implementation will work without sound files (silent mode).

## Browser Compatibility:

- Chrome/Edge: Full support
- Firefox: Full support  
- Safari/iOS: Full support (requires user gesture before first play)
- All browsers: Graceful fallback if files missing