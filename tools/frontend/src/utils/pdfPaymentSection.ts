// Payment QR and Account Details Section for PDF Reports
// This can be used across all PDF report generators

export interface PaymentDetails {
  upiId?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  accountHolder?: string;
  phone?: string;
  email?: string;
}

// Default payment details - can be overridden by clinic settings
const DEFAULT_PAYMENT_DETAILS: PaymentDetails = {
  upiId: 'wba99clinic@paytm',
  accountNumber: 'XXXX XXXX XXXX 1234',
  ifscCode: 'SBIN0001234',
  bankName: 'State Bank of India',
  accountHolder: 'WBA99 Physiotherapy Clinic',
  phone: '+91 98765 43210',
  email: 'support@wba99.com',
};

// Generate QR Code SVG pattern
const generateQRPattern = () => {
  return `
    <svg viewBox="0 0 100 100" width="100" height="100" style="padding: 10px;">
      <!-- QR Code Pattern (simplified representation) -->
      <rect x="10" y="10" width="20" height="20" fill="#333"/>
      <rect x="70" y="10" width="20" height="20" fill="#333"/>
      <rect x="10" y="70" width="20" height="20" fill="#333"/>
      <rect x="35" y="10" width="5" height="5" fill="#333"/>
      <rect x="45" y="10" width="5" height="5" fill="#333"/>
      <rect x="55" y="10" width="5" height="5" fill="#333"/>
      <rect x="35" y="35" width="30" height="30" fill="#333"/>
      <rect x="40" y="40" width="20" height="20" fill="#fff"/>
      <rect x="45" y="45" width="10" height="10" fill="#333"/>
      <rect x="10" y="35" width="5" height="5" fill="#333"/>
      <rect x="20" y="40" width="5" height="5" fill="#333"/>
      <rect x="85" y="35" width="5" height="5" fill="#333"/>
      <rect x="75" y="45" width="5" height="5" fill="#333"/>
      <rect x="85" y="55" width="5" height="5" fill="#333"/>
      <rect x="35" y="75" width="5" height="5" fill="#333"/>
      <rect x="45" y="80" width="5" height="5" fill="#333"/>
      <rect x="55" y="75" width="5" height="5" fill="#333"/>
      <rect x="75" y="75" width="5" height="5" fill="#333"/>
      <rect x="85" y="85" width="5" height="5" fill="#333"/>
      <rect x="15" y="50" width="5" height="5" fill="#333"/>
      <rect x="50" y="60" width="5" height="5" fill="#333"/>
      <rect x="60" y="85" width="5" height="5" fill="#333"/>
    </svg>
  `;
};

// Generate Payment Section HTML for PDF
export const generatePaymentSectionHTML = (
  categoryColor: string = '#00BCD4',
  customPaymentDetails?: Partial<PaymentDetails>
): string => {
  const payment = { ...DEFAULT_PAYMENT_DETAILS, ...customPaymentDetails };
  
  return `
  <!-- Payment Section with QR -->
  <div class="payment-section" style="margin-top: 25px; page-break-inside: avoid;">
    <div style="background: linear-gradient(135deg, #fff, #f5f5f5); border-radius: 12px; padding: 20px; border: 2px dashed ${categoryColor};">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="flex: 1;">
          <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span>💳</span>
            <span>Payment Information</span>
          </div>
          <div style="font-size: 11px; color: #666; margin-bottom: 15px;">
            For online payment, scan the QR code or use the details below.
          </div>
          
          <!-- UPI Section -->
          <div style="background: linear-gradient(135deg, #e8f5e9, #f1f8e9); border-radius: 8px; padding: 12px; margin-bottom: 10px; border-left: 4px solid #4CAF50;">
            <div style="font-size: 10px; color: #666; margin-bottom: 4px;">UPI ID (Recommended)</div>
            <div style="font-size: 14px; font-weight: bold; color: #2e7d32;">${payment.upiId}</div>
          </div>
          
          <!-- Bank Details -->
          <div style="background: #f5f5f5; border-radius: 8px; padding: 12px;">
            <div style="font-size: 10px; color: #666; margin-bottom: 6px; font-weight: bold;">Bank Transfer Details</div>
            <table style="font-size: 11px; color: #333; width: 100%;">
              <tr><td style="padding: 2px 0; color: #666;">Account Holder:</td><td style="font-weight: bold;">${payment.accountHolder}</td></tr>
              <tr><td style="padding: 2px 0; color: #666;">Account No:</td><td style="font-weight: bold;">${payment.accountNumber}</td></tr>
              <tr><td style="padding: 2px 0; color: #666;">IFSC Code:</td><td style="font-weight: bold;">${payment.ifscCode}</td></tr>
              <tr><td style="padding: 2px 0; color: #666;">Bank:</td><td style="font-weight: bold;">${payment.bankName}</td></tr>
            </table>
          </div>
        </div>
        
        <!-- QR Code -->
        <div style="text-align: center; margin-left: 20px;">
          <div style="width: 120px; height: 120px; background: #fff; border: 2px solid #333; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
            ${generateQRPattern()}
          </div>
          <div style="font-size: 10px; color: #666; font-weight: bold;">Scan to Pay</div>
          <div style="font-size: 9px; color: #999; margin-top: 4px;">UPI / GPay / PhonePe</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Contact Section -->
  <div style="margin-top: 15px; background: linear-gradient(135deg, ${categoryColor}10, ${categoryColor}05); border-radius: 12px; padding: 15px; border: 1px solid ${categoryColor}30;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 14px; font-weight: bold; color: ${categoryColor};">📞 Need Help? Contact Us</div>
        <div style="font-size: 11px; color: #666; margin-top: 5px;">Phone: ${payment.phone} | Email: ${payment.email}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 10px; color: #666;">Follow-up Appointment</div>
        <div style="font-size: 12px; font-weight: bold; color: #333;">Book via WBA99 App</div>
      </div>
    </div>
  </div>
  `;
};

// AI Analysis Section for PDF
export const generateAISectionHTML = (categoryColor: string = '#00BCD4', analysisType: string = 'Assessment'): string => {
  return `
  <!-- AI Analysis Section -->
  <div class="ai-section" style="background: linear-gradient(135deg, #1a237e, #311b92); border-radius: 12px; padding: 20px; margin-top: 20px; color: white; page-break-inside: avoid;">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
      <span style="font-size: 24px;">🤖</span>
      <span style="font-size: 18px; font-weight: bold;">AI-Powered ${analysisType} Analysis</span>
      <span style="background: #00e676; color: #1a237e; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: bold; margin-left: auto;">POWERED BY AI</span>
    </div>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
      <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; text-align: center;">
        <div style="font-size: 24px; margin-bottom: 5px;">📊</div>
        <div style="font-size: 12px; font-weight: bold;">Progress Tracking</div>
        <div style="font-size: 10px; opacity: 0.8;">AI monitors improvement daily</div>
      </div>
      <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; text-align: center;">
        <div style="font-size: 24px; margin-bottom: 5px;">🎯</div>
        <div style="font-size: 12px; font-weight: bold;">Personalized Plan</div>
        <div style="font-size: 10px; opacity: 0.8;">Adapts to your recovery</div>
      </div>
      <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; text-align: center;">
        <div style="font-size: 24px; margin-bottom: 5px;">🔔</div>
        <div style="font-size: 12px; font-weight: bold;">Smart Reminders</div>
        <div style="font-size: 10px; opacity: 0.8;">Never miss exercises</div>
      </div>
    </div>
  </div>
  `;
};

export default { generatePaymentSectionHTML, generateAISectionHTML };
