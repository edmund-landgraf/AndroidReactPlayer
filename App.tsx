/**
 * AndroidReactPlayer
 * A clean audio player for Android — load local files, control playback.
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DocumentPicker, {
  DocumentPickerResponse,
  types,
} from 'react-native-document-picker';
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  PlaybackState,
  State,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import Slider from '@react-native-community/slider';

// ─── Constants ───────────────────────────────────────────────────────────────
const SEEK_SECONDS = 10;

// ─── Setup Service (required by track-player) ────────────────────────────────
export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.RemoteJumpForward, async event => {
    const pos = await TrackPlayer.getPosition();
    await TrackPlayer.seekTo(pos + (event.interval ?? SEEK_SECONDS));
  });
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async event => {
    const pos = await TrackPlayer.getPosition();
    await TrackPlayer.seekTo(Math.max(0, pos - (event.interval ?? SEEK_SECONDS)));
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App(): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const [trackTitle, setTrackTitle] = useState<string>('No file loaded');
  const [volume, setVolume] = useState(1.0);
  const [loading, setLoading] = useState(false);

  const playbackState = usePlaybackState();
  const {position, duration} = useProgress(250);

  const isPlaying =
    playbackState.state === State.Playing ||
    playbackState.state === State.Buffering;

  // Pulse animation for the play button when playing
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.08,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulse.stopAnimation();
      Animated.timing(pulse, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [isPlaying, pulse]);

  // ── Init TrackPlayer once ──────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await TrackPlayer.setupPlayer({
          maxCacheSize: 1024 * 5,
        });
        await TrackPlayer.updateOptions({
          android: {
            appKilledPlaybackBehavior:
              AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
          },
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.Stop,
            Capability.JumpForward,
            Capability.JumpBackward,
          ],
          compactCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.Stop,
          ],
          notificationCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.Stop,
            Capability.JumpForward,
            Capability.JumpBackward,
          ],
          forwardJumpInterval: SEEK_SECONDS,
          backwardJumpInterval: SEEK_SECONDS,
        });
        if (mounted) setReady(true);
      } catch (e: any) {
        // Already initialized on re-render
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ── Volume sync ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (ready) {
      TrackPlayer.setVolume(volume);
    }
  }, [volume, ready]);

  // ── Load file from device ──────────────────────────────────────────────────
  const handleLoadFile = useCallback(async () => {
    if (!ready) return;
    try {
      setLoading(true);
      const result: DocumentPickerResponse[] = await DocumentPicker.pick({
        type: [types.audio],
        allowMultiSelection: false,
        copyTo: 'cachesDirectory',
      });

      const file = result[0];
      const uri = file.fileCopyUri ?? file.uri;
      const title =
        file.name?.replace(/\.[^.]+$/, '') ?? 'Unknown';

      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: 'local-track',
        url: uri,
        title,
        artist: 'Local File',
      });

      setTrackTitle(title);
    } catch (e: any) {
      if (!DocumentPicker.isCancel(e)) {
        Alert.alert('Load Error', e?.message ?? 'Could not load file.');
      }
    } finally {
      setLoading(false);
    }
  }, [ready]);

  // ── Playback controls ──────────────────────────────────────────────────────
  const handlePlayPause = useCallback(async () => {
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  }, [isPlaying]);

  const handleStop = useCallback(async () => {
    await TrackPlayer.stop();
    await TrackPlayer.seekTo(0);
  }, []);

  const handleRewind = useCallback(async () => {
    const pos = await TrackPlayer.getPosition();
    await TrackPlayer.seekTo(Math.max(0, pos - SEEK_SECONDS));
  }, []);

  const handleFastForward = useCallback(async () => {
    const pos = await TrackPlayer.getPosition();
    const dur = await TrackPlayer.getDuration();
    await TrackPlayer.seekTo(Math.min(dur, pos + SEEK_SECONDS));
  }, []);

  const handleSeek = useCallback((value: number) => {
    TrackPlayer.seekTo(value);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E8C547" />
        <Text style={styles.loadingText}>Initializing player…</Text>
      </View>
    );
  }

  const hasTrack = trackTitle !== 'No file loaded';
  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0E0E12" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>REACT PLAYER</Text>
        <Text style={styles.appSub}>Android · Local Audio</Text>
      </View>

      {/* Track card */}
      <View style={styles.card}>
        {/* Waveform decoration */}
        <View style={styles.waveContainer}>
          {Array.from({length: 32}).map((_, i) => {
            const height = isPlaying
              ? 8 + Math.abs(Math.sin((i / 32) * Math.PI * 3 + Date.now() / 500)) * 32
              : 4 + Math.abs(Math.sin((i / 32) * Math.PI * 3)) * (progress * 32);
            return (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height: Math.max(4, height),
                    opacity: i / 32 <= progress ? 1 : 0.25,
                    backgroundColor: i / 32 <= progress ? '#E8C547' : '#555',
                  },
                ]}
              />
            );
          })}
        </View>

        <Text style={styles.trackTitle} numberOfLines={1}>
          {trackTitle}
        </Text>
        <Text style={styles.trackSub}>
          {hasTrack ? 'Local Device File' : 'Tap Load to select audio'}
        </Text>

        {/* Seek bar */}
        <View style={styles.seekRow}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration > 0 ? duration : 1}
            value={position}
            onSlidingComplete={handleSeek}
            minimumTrackTintColor="#E8C547"
            maximumTrackTintColor="#333"
            thumbTintColor="#E8C547"
            disabled={!hasTrack}
          />
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* Transport controls */}
      <View style={styles.controls}>
        {/* REW */}
        <TouchableOpacity
          style={[styles.controlBtn, styles.secondaryBtn]}
          onPress={handleRewind}
          disabled={!hasTrack}
          activeOpacity={0.7}>
          <Text style={styles.controlIcon}>⏪</Text>
          <Text style={styles.controlLabel}>{SEEK_SECONDS}s</Text>
        </TouchableOpacity>

        {/* STOP */}
        <TouchableOpacity
          style={[styles.controlBtn, styles.secondaryBtn]}
          onPress={handleStop}
          disabled={!hasTrack}
          activeOpacity={0.7}>
          <Text style={styles.controlIcon}>⏹</Text>
          <Text style={styles.controlLabel}>Stop</Text>
        </TouchableOpacity>

        {/* PLAY / PAUSE */}
        <Animated.View style={{transform: [{scale: pulse}]}}>
          <TouchableOpacity
            style={[styles.controlBtn, styles.primaryBtn]}
            onPress={handlePlayPause}
            disabled={!hasTrack}
            activeOpacity={0.8}>
            <Text style={[styles.controlIcon, styles.primaryIcon]}>
              {isPlaying ? '⏸' : '▶'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* FF */}
        <TouchableOpacity
          style={[styles.controlBtn, styles.secondaryBtn]}
          onPress={handleFastForward}
          disabled={!hasTrack}
          activeOpacity={0.7}>
          <Text style={styles.controlIcon}>⏩</Text>
          <Text style={styles.controlLabel}>{SEEK_SECONDS}s</Text>
        </TouchableOpacity>
      </View>

      {/* Volume */}
      <View style={styles.volumeRow}>
        <Text style={styles.volLabel}>🔈</Text>
        <Slider
          style={styles.volumeSlider}
          minimumValue={0}
          maximumValue={1}
          value={volume}
          onValueChange={setVolume}
          minimumTrackTintColor="#E8C547"
          maximumTrackTintColor="#333"
          thumbTintColor="#E8C547"
        />
        <Text style={styles.volLabel}>🔊</Text>
        <Text style={styles.volPct}>{Math.round(volume * 100)}%</Text>
      </View>

      {/* Load button */}
      <TouchableOpacity
        style={styles.loadBtn}
        onPress={handleLoadFile}
        activeOpacity={0.8}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#0E0E12" />
        ) : (
          <Text style={styles.loadBtnText}>
            {hasTrack ? '📂  Change File' : '📂  Load Audio File'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0E12',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0E0E12',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 14,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  appTitle: {
    color: '#E8C547',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 8,
    fontFamily: 'monospace',
  },
  appSub: {
    color: '#555',
    fontSize: 11,
    letterSpacing: 3,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  card: {
    backgroundColor: '#16161C',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#222',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 44,
    gap: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  waveBar: {
    flex: 1,
    borderRadius: 2,
  },
  trackTitle: {
    color: '#F0F0F0',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  trackSub: {
    color: '#555',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  seekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    color: '#777',
    fontSize: 11,
    fontFamily: 'monospace',
    width: 36,
  },
  slider: {
    flex: 1,
    height: 32,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  controlBtn: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    width: 68,
    height: 68,
    backgroundColor: '#1C1C24',
    borderWidth: 1,
    borderColor: '#2A2A35',
  },
  primaryBtn: {
    width: 80,
    height: 80,
    backgroundColor: '#E8C547',
    borderRadius: 40,
    shadowColor: '#E8C547',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  controlIcon: {
    fontSize: 22,
    color: '#CCC',
  },
  primaryIcon: {
    color: '#0E0E12',
    fontSize: 28,
  },
  controlLabel: {
    color: '#555',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  volLabel: {
    fontSize: 18,
  },
  volumeSlider: {
    flex: 1,
    height: 32,
  },
  volPct: {
    color: '#E8C547',
    fontSize: 12,
    fontFamily: 'monospace',
    width: 40,
    textAlign: 'right',
  },
  loadBtn: {
    backgroundColor: '#E8C547',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadBtnText: {
    color: '#0E0E12',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
});
