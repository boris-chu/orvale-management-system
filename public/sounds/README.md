# Call System Sound Files

This directory contains sound files for the WebRTC calling system.

## Current Files:

- `mixkit-happy-bells-notification-937.wav` - Notification sound for call events (pleasant bell sound)
- `ringtone.mp3` - Ringtone played for incoming calls (needs to be added - should loop)

## Required Files:

- `ringtone.mp3` - Ringtone played for incoming calls (should loop)
- `mixkit-happy-bells-notification-937.wav` - ✅ Available - Notification sound for call events

## File Requirements:

- **Format**: MP3 or WAV (both supported by modern browsers)
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