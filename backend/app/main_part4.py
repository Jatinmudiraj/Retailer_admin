
# -----------------------
# Payment Endpoints
# -----------------------
import razorpay
from app.schemas import PaymentOrderIn, PaymentVerifyIn

# Initialize Razorpay Client
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_1DP5mmOlF5G5ag")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "s4Sj5Ad8I870123")

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# Endpoints commented out in original file, keeping them commented or omitted
# as per migration strictness.
# To enable, simply uncomment and adapt to Async/Beanie if needed.
