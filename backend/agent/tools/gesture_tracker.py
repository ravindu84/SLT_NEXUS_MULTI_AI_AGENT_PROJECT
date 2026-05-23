import cv2
import mediapipe as mp
import mediapipe.python.solutions.hands as mp_hands
import mediapipe.python.solutions.drawing_utils as mp_draw
import numpy as np
import base64

class GestureRecognizer:
    def __init__(self):
        self.mp_hands = mp_hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=True, 
            max_num_hands=2, 
            min_detection_confidence=0.5
        )
        self.mp_draw = mp_draw

    def _decode_image(self, base64_string):
        """Decode base64 string to OpenCV image format."""
        try:
            # Handle cases where frontend sends 'data:image/jpeg;base64,...'
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
                
            img_data = base64.b64decode(base64_string)
            np_arr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            return img
        except Exception as e:
            print(f"Image decode error: {e}")
            return None

    def analyze_gesture(self, base64_string):
        """Analyze the image and return the predicted gesture string."""
        img = self._decode_image(base64_string)
        if img is None:
            return "ERROR: Could not decode image."

        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = self.hands.process(img_rgb)

        if not results.multi_hand_landmarks:
            return "No hand detected"

        # Analyze the first detected hand
        hand_landmarks = results.multi_hand_landmarks[0]
        
        # Determine fingers up
        # Landmarks:
        # Thumb: 4, Index: 8, Middle: 12, Ring: 16, Pinky: 20
        # Tip joints vs lower joints to see if finger is folded
        
        tips = [8, 12, 16, 20]
        mcp = [5, 9, 13, 17] # Knuckles
        
        fingers_up = []
        
        # Check Thumb (comparing X axis instead of Y for thumb fold)
        # Using pseudo-distance for simplicity (tip x vs mcp x)
        thumb_tip_x = hand_landmarks.landmark[4].x
        thumb_mcp_x = hand_landmarks.landmark[2].x
        
        # Check if thumb is extended (left or right depending on hand, simplify using distance)
        thumb_is_up = hand_landmarks.landmark[4].y < hand_landmarks.landmark[3].y
        fingers_up.append(thumb_is_up)

        # Check other 4 fingers (Y axis)
        for i in range(4):
            # If tip is higher (lower Y value) than knuckle, finger is up
            is_up = hand_landmarks.landmark[tips[i]].y < hand_landmarks.landmark[mcp[i]].y
            fingers_up.append(is_up)
            
        # Fingers array: [Thumb, Index, Middle, Ring, Pinky]
        
        # Gesture Mapping (10 Gestures for SLT Prototype)
        if fingers_up == [True, False, False, False, False]:
            return "[GESTURE: YES]"  # Thumbs Up
            
        elif fingers_up == [False, False, False, False, False]:
            return "[GESTURE: HELLO]"  # Fist
            
        elif fingers_up == [True, True, True, True, True] or fingers_up == [False, True, True, True, True]:
            return "[GESTURE: STOP]"  # Open Palm
            
        elif fingers_up == [False, True, True, False, False]:
            return "[GESTURE: THANK YOU]"  # Peace / V Sign
            
        elif fingers_up == [False, True, False, False, False]:
            return "[GESTURE: I WANT]"  # Pointing Index
            
        elif fingers_up == [True, False, False, False, True]:
            return "[GESTURE: CALL ME]"  # Shaka (Thumb + Pinky)
            
        elif fingers_up == [False, True, True, True, False]:
            return "[GESTURE: HELP]"  # Three middle fingers up
            
        elif fingers_up == [True, True, False, False, False]:
            # Could be OK sign or Gun sign. Map to OK/Good
            return "[GESTURE: GOOD]" 
            
        elif fingers_up == [False, False, True, True, True]:
            return "[GESTURE: OK]" # Classic OK sign (index down, others up)
            
        # Adding a fallback heuristic for Thumbs Down
        thumb_tip_y = hand_landmarks.landmark[4].y
        wrist_y = hand_landmarks.landmark[0].y
        if thumb_tip_y > wrist_y and fingers_up[1:] == [False, False, False, False]:
            return "[GESTURE: NO]"  # Thumbs Down

        return "Unknown Gesture"

# Global Instance
recognizer = GestureRecognizer()

def detect_sign_language(base64_string: str) -> str:
    """Entry point for the FastAPI endpoint."""
    return recognizer.analyze_gesture(base64_string)
