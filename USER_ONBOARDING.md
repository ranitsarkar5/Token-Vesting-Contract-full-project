# 👥 User Onboarding & Feedback Collection

This document outlines the requirements and setup for onboarding a minimum of 10+ real users, collecting proof of their wallet interactions, and gathering mandatory feedback.

---

## 📋 Onboarding Requirements Checklist
*   **Target**: Minimum 10 real users onboarded.
*   **Proof**: Collect Stellar Public Address and Transaction Hash / Proof of Interaction for each user.
*   **Feedback**: Collect user experience rating and suggestions for improvement.

---

## 🛠️ Google Form Setup Prompt (AI Copilot / ChatGPT)
Copy and paste the prompt below into an LLM (like ChatGPT, Gemini, or Claude) or Google Forms AI Builder to instantly generate the structure and settings for your onboarding form:

```text
Create a Google Form titled "Token Vesting Hub - User Onboarding & Feedback" with a dark purple theme matching the web3 aesthetic. The form is designed to collect feedback and transaction proof from at least 10 users interacting with our Stellar DApp.

Please generate the following fields:

1. Form Description:
"Thank you for testing the Token Vesting Hub built on Stellar Soroban! Please complete this form to submit your test transaction proof and help us improve the DApp. Your feedback is highly appreciated."

2. Question 1:
- Title: "Stellar Public Address"
- Type: Short Answer
- Help Text: "Provide your public key (starting with 'G') that you connected to the DApp."
- Validation: Required (Required text matching pattern: ^G[A-Z0-9]{55}$)

3. Question 2:
- Title: "Transaction Hash / Proof of Interaction"
- Type: Short Answer
- Help Text: "Paste the Stellar transaction hash of your vesting plan creation or claim execution (e.g. from Stellar Expert or Freighter)."
- Validation: Required (Required, length must be exactly 64 characters)

4. Question 3:
- Title: "How easy was it to connect your wallet and use the app?"
- Type: Linear Scale (1 to 5)
- Label for 1: "Very Difficult"
- Label for 5: "Very Easy"
- Validation: Required

5. Question 4:
- Title: "Suggestions for Improvement"
- Type: Paragraph
- Help Text: "What features or UX enhancements would you like to see next?"
- Validation: Optional
```

---

## 📝 How to Link the Form in Your Repository
Once you create the Google Form:
1. Click **Send** in the top right of your Google Form dashboard.
2. Select the **Link** icon and copy the shortened URL.
3. Paste the URL below in this file and commit it:

*   **Google Form Live Link**: [Google Form](https://docs.google.com/forms/d/e/1FAIpQLSeB0sAEbsSiKVP0CGs9Un2HCegv1Ab8n42uxbR-b0A10AKSiA/viewform?usp=publish-editor)
