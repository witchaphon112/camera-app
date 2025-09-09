import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Image, 
  Platform,
  Alert,
  StatusBar,
  LogBox 
} from 'react-native';
import { 
  CameraView, 
  CameraType, 
  FlashMode, 
  useCameraPermissions 
} from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';

LogBox.ignoreLogs(['Possible Unhandled Promise Rejection']);

export default function CameraApp() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [image, setImage] = useState<string | null>(null);
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [flashMode, setFlashMode] = useState<FlashMode>('off' as FlashMode);
  const cameraRef = useRef<CameraView>(null);
  
  const [flashStatus, setFlashStatus] = useState<string>('Flash: OFF');

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    await requestCameraPermission();
    await requestMediaPermission();
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: Platform.OS === 'android',
          exif: true
        });
        console.log("Photo taken:", photo.uri);
        setImage(photo.uri);
      } catch (error) {
        console.error("Camera error:", error);
        Alert.alert('Error', 'Failed to take picture: ' + (error as Error).message);
      }
    } else {
      Alert.alert('Error', 'Camera is not ready');
    }
  };

  const retakePicture = () => {
    setImage(null);
  };

  const savePhoto = async () => {
    if (image) {
      try {
        if (!mediaPermission?.granted) {
          const permission = await MediaLibrary.requestPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Error', 'Need media library permission to save photos');
            return;
          }
        }
        
        const asset = await MediaLibrary.createAssetAsync(image);
        console.log("Asset created:", asset);
        
        try {
          const album = await MediaLibrary.getAlbumAsync('CameraApp');
          if (album) {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          } else {
            await MediaLibrary.createAlbumAsync('CameraApp', asset, false);
          }
          
          Alert.alert('สำเร็จ', 'บันทึกรูปภาพเรียบร้อยแล้ว!');
          setImage(null);
        } catch (albumError) {
          console.error("Album error:", albumError);
          Alert.alert('สำเร็จ', 'บันทึกรูปภาพเรียบร้อยแล้ว (แต่ไม่สามารถเพิ่มเข้า album ได้)');
          setImage(null);
        }
      } catch (error) {
        console.error('Save error:', error);
        Alert.alert('Error', 'Failed to save photo: ' + (error as Error).message);
      }
    }
  };

  const toggleCameraType = () => {
    setCameraType(current => {
      const newType = current === 'back' ? 'front' : 'back';
      console.log("Switching camera to:", newType);
      
      if (newType === 'front' && flashMode !== 'off') {
        setFlashMode('off' as FlashMode);
        setFlashStatus('Flash: Disabled (front camera)');
      }
      
      return newType;
    });
  };

  const toggleFlash = () => {
    setFlashMode(current => {
      // ตรวจสอบเงื่อนไขการใช้แฟลช
      if (cameraType === 'front') {
        Alert.alert('ไม่สามารถใช้แฟลช', 'กล้องหน้าไม่รองรับการใช้แฟลช');
        setFlashStatus('Flash: Not available on front camera');
        return 'off' as FlashMode;
      }
      
      const newMode = current === 'off' ? 'on' : 'off';
      console.log("Toggling flash from:", current, "to:", newMode);
      
      setFlashStatus(`Flash: ${newMode.toUpperCase()}`);
      
      return newMode as FlashMode;
    });
  };

  if (!cameraPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>กำลังตรวจสอบสิทธิ์การใช้งานกล้อง...</Text>
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>กรุณาอนุญาตการเข้าถึงกล้อง</Text>
        <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
          <Text style={styles.buttonText}>อนุญาต</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!mediaPermission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>กรุณาอนุญาตการเข้าถึงคลังรูปภาพ</Text>
        <TouchableOpacity style={styles.button} onPress={requestMediaPermission}>
          <Text style={styles.buttonText}>อนุญาต</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {!image ? (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={cameraType}
          flashMode={flashMode}
          enableZoomGesture
        >
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>{flashStatus}</Text>
          </View>
          
          <View style={styles.controls}>
            <TouchableOpacity 
              style={[
                styles.controlButton,
                cameraType === 'front' && styles.controlButtonDisabled
              ]} 
              onPress={toggleFlash}
              disabled={cameraType === 'front'}
            >
              <Ionicons 
                name={flashMode === 'on' ? 'flash' : 'flash-off'} 
                size={30} 
                color={cameraType === 'front' ? 'gray' : 'white'} 
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={toggleCameraType}>
              <Ionicons name="camera-reverse" size={30} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.captureContainer}>
            <TouchableOpacity 
              style={styles.captureButton} 
              onPress={takePicture}
              activeOpacity={0.6} 
            >
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: image }} style={styles.previewImage} />
          
          <View style={styles.previewControls}>
            <TouchableOpacity 
              style={styles.previewButton} 
              onPress={retakePicture}
              activeOpacity={0.7}
            >
              <Ionicons name="camera" size={24} color="white" />
              <Text style={styles.previewButtonText}>ถ่ายใหม่</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.previewButton} 
              onPress={savePhoto}
              activeOpacity={0.7}
            >
              <Ionicons name="save" size={24} color="white" />
              <Text style={styles.previewButtonText}>บันทึก</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    right: 20,
    flexDirection: 'row',
    gap: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 15,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonDisabled: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    opacity: 0.7,
  },
  captureContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 50,
    alignSelf: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  captureInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: 'black',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  previewControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 50,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  previewButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 120,
    justifyContent: 'center',
  },
  previewButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignSelf: 'center',
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  debugInfo: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 5,
  },
  debugText: {
    color: 'white',
    fontSize: 12,
  },
});