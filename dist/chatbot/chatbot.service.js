"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ChatbotService", {
    enumerable: true,
    get: function() {
        return ChatbotService;
    }
});
const _common = require("@nestjs/common");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let ChatbotService = class ChatbotService {
    reply(messageInput, language) {
        const message = messageInput.trim().toLowerCase();
        const hindi = language === 'hi';
        if (/safety|safe|report|block|suraksha|सुरक्षा|रिपोर्ट|ब्लॉक/.test(message)) {
            return hindi ? 'अपनी सुरक्षा के लिए निजी जानकारी साझा न करें। किसी प्रोफ़ाइल या मैसेज को रिपोर्ट/ब्लॉक करने के लिए उसके मेन्यू में Report या Block चुनें।' : 'Keep personal information private. To report or block someone, open the profile or message menu and choose Report or Block.';
        }
        if (/match|like|discover|मैच|लाइक/.test(message)) {
            return hindi ? 'Discover पेज पर प्रोफ़ाइल पसंद करने के लिए Like करें। जब दोनों लोग एक-दूसरे को Like करते हैं, तो Match बन जाता है।' : 'Use Like on the Discover page. A match is created when both people like each other.';
        }
        if (/message|chat|मैसेज|चैट/.test(message)) {
            return hindi ? 'मैच होने के बाद Messages सेक्शन खोलें, अपना मैच चुनें और बातचीत शुरू करें।' : 'After matching, open Messages, select the match, and start your conversation.';
        }
        if (/premium|gold|diamond|plan|payment|डायमंड|गोल्ड|प्लान|पेमेंट/.test(message)) {
            return hindi ? 'Gold और Diamond प्लान की जानकारी Premium पेज पर उपलब्ध है। वहीं से फीचर्स और कीमत देखकर अपग्रेड कर सकते हैं।' : 'Gold and Diamond plan details are available on the Premium page, where you can compare features and upgrade.';
        }
        if (/profile|photo|verify|प्रोफ़ाइल|फोटो|वेरिफ/.test(message)) {
            return hindi ? 'Profile सेक्शन में जाकर फोटो, बायो और पसंद अपडेट करें। पूरा और verified प्रोफ़ाइल बेहतर matches पाने में मदद करता है।' : 'Open Profile to update photos, bio, and preferences. A complete and verified profile helps you find better matches.';
        }
        return hindi ? 'मैं ConnectLove सहायक हूँ। आप मुझसे मैच, मैसेज, प्रोफ़ाइल, सुरक्षा या Gold/Diamond प्लान के बारे में पूछ सकते हैं।' : 'I am your ConnectLove assistant. Ask me about matches, messages, profiles, safety, or Gold/Diamond plans.';
    }
};
ChatbotService = _ts_decorate([
    (0, _common.Injectable)()
], ChatbotService);

//# sourceMappingURL=chatbot.service.js.map