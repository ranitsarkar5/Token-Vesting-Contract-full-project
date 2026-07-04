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
- Title: "Name"
- Type: Short Answer
- Validation: Optional

3. Question 2:
- Title: "Email"
- Type: Short Answer
- Validation: Optional

4. Question 3:
- Title: "Did you successfully connect your wallet?"
- Type: Multiple Choice
- Options: "Yes", "No", "Time Consuming", "Other"
- Validation: Required

5. Question 4:
- Title: "Wallet Address"
- Type: Short Answer
- Help Text: "Provide your public key (starting with 'G') that you connected to the DApp."
- Validation: Required (Required text matching pattern: ^G[A-Z0-9]{55}$)

6. Question 5:
- Title: "Transaction Hash"
- Type: Short Answer
- Help Text: "Paste the Stellar transaction hash of your vesting plan creation or claim execution (e.g. from Stellar Expert or Freighter)."
- Validation: Required (Required, length must be exactly 64 characters)

7. Question 6:
- Title: "Which part of the platform did you like the most?"
- Type: Paragraph
- Validation: Optional

8. Question 7:
- Title: "Which features do you think the platform is missing or could be added?"
- Type: Paragraph
- Validation: Required

9. Question 8:
- Title: "Rate overall Platform User Experience (UX)?"
- Type: Linear Scale (1 to 5)
- Label for 1: "Very Poor"
- Label for 5: "Excellent"
- Validation: Required
```

---

## 📝 How to Link the Form in Your Repository
Once you create the Google Form:
1. Click **Send** in the top right of your Google Form dashboard.
2. Select the **Link** icon and copy the shortened URL.
3. Paste the URL below in this file and commit it:

*   **Google Form Live Link**: [Google Form](https://docs.google.com/spreadsheets/d/1pwHqSodUPDT_zJyEcjOPrsNBe_40EG8F0eYSsysb-pU/edit?resourcekey=&gid=574562325#gid=574562325)