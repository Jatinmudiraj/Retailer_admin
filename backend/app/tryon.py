import cv2
import numpy as np
import requests
from io import BytesIO
from PIL import Image
import os

class VirtualTryOn:
    def __init__(self):
        # Use OpenCV Haar Cascades for face detection as fallback for MediaPipe on Python 3.13
        # Ensure opencv-python is installed
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

    def _get_image_from_url(self, url: str) -> np.ndarray:
        resp = requests.get(url)
        img = Image.open(BytesIO(resp.content)).convert('RGBA')
        return np.array(img)

    def _overlay_image(self, background: np.ndarray, foreground: np.ndarray, x: int, y: int, w: int, h: int, angle: float = 0):
        # Resize foreground
        fg = Image.fromarray(foreground)
        fg = fg.resize((w, h), Image.Resampling.LANCZOS)
        
        # Rotate if needed
        if angle != 0:
            fg = fg.rotate(angle, expand=True)

        bg = Image.fromarray(background)
        
        # Calculate paste position (centered)
        paste_x = x - fg.width // 2
        paste_y = y - fg.height // 2
        
        bg.paste(fg, (paste_x, paste_y), fg)
        return np.array(bg)

    def process_try_on(self, user_img_bytes: bytes, product_url: str, category: str) -> bytes:
        # Load User Image
        nparr = np.frombuffer(user_img_bytes, np.uint8)
        user_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        gray = cv2.cvtColor(user_img, cv2.COLOR_BGR2GRAY)
        user_img_rgb = cv2.cvtColor(user_img, cv2.COLOR_BGR2RGB)
        
        faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
        
        if len(faces) == 0:
            raise ValueError("No face detected in the image.")

        # Take largest face
        (x, y, w, h) = max(faces, key=lambda f: f[2] * f[3])
        
        # Load Product Image
        if product_url.startswith("http"):
             product_img_arr = self._get_image_from_url(product_url)
        else:
             raise ValueError("Invalid product image URL")

        final_img = user_img_rgb.copy()

        if "necklace" in category.lower():
            # Necklace Logic
            # Approx position: Below chin. Chin is approx at y + h.
            # Width: Slightly wider than face (w)
            
            neck_width = int(w * 1.5)
            aspect_ratio = product_img_arr.shape[0] / product_img_arr.shape[1]
            neck_height = int(neck_width * aspect_ratio)
            
            pos_x = x + w // 2
            pos_y = y + h + int(neck_height * 0.2) # Just below face
            
            final_img = self._overlay_image(final_img, product_img_arr, pos_x, pos_y, neck_width, neck_height)

        elif "earring" in category.lower():
            # Earring Logic
            # Approx ears: Left (x, y+h/2), Right (x+w, y+h/2)
            # Refine with eye detection if possible, else use geometry
            
            earring_h = int(h * 0.25)
            aspect_ratio = product_img_arr.shape[1] / product_img_arr.shape[0]
            earring_w = int(earring_h * aspect_ratio)
            
            # Left Ear area
            lx = x - int(w * 0.1)
            ly = y + h // 2 + int(h * 0.1)
            
            # Right Ear area
            rx = x + w + int(w * 0.1)
            ry = y + h // 2 + int(h * 0.1)

            final_img = self._overlay_image(final_img, product_img_arr, lx, ly, earring_w, earring_h)
            final_img = self._overlay_image(final_img, product_img_arr, rx, ry, earring_w, earring_h)
        
        else:
            # Fallback (Forehead/Bindi)
            cx = x + w // 2
            cy = y + int(h * 0.2) # Upper forehead
            
            size_w = int(w * 0.15)
            aspect_ratio = product_img_arr.shape[0] / product_img_arr.shape[1]
            size_h = int(size_w * aspect_ratio)

            final_img = self._overlay_image(final_img, product_img_arr, cx, cy, size_w, size_h)

        # Convert back to bytes
        final_pil = Image.fromarray(final_img)
        buf = BytesIO()
        final_pil.save(buf, format="PNG")
        return buf.getvalue()

try_on_service = VirtualTryOn()
