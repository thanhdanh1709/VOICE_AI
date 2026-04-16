import re
import json
from pathlib import Path

class VietnameseTTSNormalizer:
    """
    A text normalizer for Vietnamese Text-to-Speech systems.
    Converts numbers, dates, units, and special characters into readable Vietnamese text.
    
    NEW FEATURES:
    - Extended currency support (Euro, Yen, RMB, GBP, etc.)
    - English phonetic pronunciation in Vietnamese
    - Optional LLM integration for meaning preservation
    """
    
    def __init__(self, llm_client=None, phonetic_dict_path=None):
        """
        Initialize normalizer.
        
        Args:
            llm_client: Optional LLM client for advanced normalization
            phonetic_dict_path: Optional path to custom phonetic dictionary JSON file
        """
        self.llm_client = llm_client
        
        self.units = {
            'km': 'ki lô mét', 'dm': 'đê xi mét', 'cm': 'xen ti mét',
            'mm': 'mi li mét', 'nm': 'na nô mét', 'µm': 'mic rô mét',
            'μm': 'mic rô mét', 'm': 'mét',
            
            'kg': 'ki lô gam', 'g': 'gam', 'mg': 'mi li gam',
            
            'km²': 'ki lô mét vuông', 'km2': 'ki lô mét vuông',
            'm²': 'mét vuông', 'm2': 'mét vuông',
            'cm²': 'xen ti mét vuông', 'cm2': 'xen ti mét vuông',
            'mm²': 'mi li mét vuông', 'mm2': 'mi li mét vuông',
            'ha': 'héc ta',
            
            'km³': 'ki lô mét khối', 'km3': 'ki lô mét khối',
            'm³': 'mét khối', 'm3': 'mét khối',
            'cm³': 'xen ti mét khối', 'cm3': 'xen ti mét khối',
            'mm³': 'mi li mét khối', 'mm3': 'mi li mét khối',
            'l': 'lít', 'dl': 'đê xi lít', 'ml': 'mi li lít', 'hl': 'héc tô lít',
            
            'v': 'vôn', 'kv': 'ki lô vôn', 'mv': 'mi li vôn',
            'a': 'am pe', 'ma': 'mi li am pe', 'ka': 'ki lô am pe',
            'w': 'oát', 'kw': 'ki lô oát', 'mw': 'mê ga oát', 'gw': 'gi ga oát',
            'kwh': 'ki lô oát giờ', 'mwh': 'mê ga oát giờ', 'wh': 'oát giờ',
            'ω': 'ôm', 'ohm': 'ôm', 'kω': 'ki lô ôm', 'mω': 'mê ga ôm',
            
            'hz': 'héc', 'khz': 'ki lô héc', 'mhz': 'mê ga héc', 'ghz': 'gi ga héc',
            
            'pa': 'pát cal', 'kpa': 'ki lô pát cal', 'mpa': 'mê ga pát cal',
            'bar': 'ba', 'mbar': 'mi li ba', 'atm': 'át mốt phia', 'psi': 'pi ét xai',
            
            'j': 'giun', 'kj': 'ki lô giun',
            'cal': 'ca lo', 'kcal': 'ki lô ca lo',
        }
        
        self.digits = ['không', 'một', 'hai', 'ba', 'bốn', 
                      'năm', 'sáu', 'bảy', 'tám', 'chín']
        
        self.currencies = {
            'đ': 'đồng',
            'vnd': 'đồng',
            'dong': 'đồng',
            '$': 'đô la',
            'usd': 'đô la',
            'dollar': 'đô la',
            'dollars': 'đô la',
            '€': 'ơ rô',
            'eur': 'ơ rô',
            'euro': 'ơ rô',
            'euros': 'ơ rô',
            '£': 'bảng anh',
            'gbp': 'bảng anh',
            'pound': 'bảng anh',
            'pounds': 'bảng anh',
            '¥': 'yên',
            'jpy': 'yên nhật',
            'yen': 'yên',
            'cny': 'nhân dân tệ',
            'rmb': 'nhân dân tệ',
            'yuan': 'nhân dân tệ',
            '₽': 'ru bơ',
            'rub': 'ru bơ',
            'ruble': 'ru bơ',
            '₩': 'won',
            'krw': 'won hàn quốc',
            'won': 'won',
            '₹': 'ru pi',
            'inr': 'ru pi',
            'rupee': 'ru pi',
            'btc': 'bít coin',
            'bitcoin': 'bít coin',
            'eth': 'i thi ri âm',
            'ethereum': 'i thi ri âm',
            'ag': 'bạc',
            'silver': 'bạc',
            'au': 'vàng',
            'gold': 'vàng',
        }
        
        self.english_phonetic = self._load_phonetic_dict(phonetic_dict_path)
        
        self._phonetic_cache = {}
    
    def _load_phonetic_dict(self, dict_path=None):
        """
        Load English phonetic dictionary from JSON files.
        
        Dictionary is split into multiple JSON files in phonetic_dicts/ folder:
        - 01_greetings.json: Greetings & common phrases
        - 02_family.json: Family & people
        - 03_technology.json: Technology terms
        - 04_social_media.json: Social media & brands
        - 05_pronouns.json: Pronouns & basic words
        - 06_communication.json: Language & communication
        - 07_education.json: Education
        - 08_home.json: Home & daily life
        - 09_food.json: Food & drinks
        - 10_emotions.json: Emotions & feelings
        - 11_time.json: Time-related words
        - 12_entertainment.json: Entertainment
        - 13_shopping.json: Shopping & money
        - 14_transportation.json: Transportation
        - 15_business.json: Work & business
        - 16_medical.json: Health & medical
        - 17_countries_asia.json: Asian countries
        - 18_countries_europe.json: European countries
        - 19_countries_americas.json: American countries
        - 20_countries_oceania_africa.json: Oceania & African countries
        - 21_cities.json: Major cities
        
        Args:
            dict_path: Optional path to custom dictionary JSON file
        
        Returns:
            dict: Merged dictionary from all JSON files
        """
        default_dict = {}
        
        dict_dir = Path(__file__).parent / 'phonetic_dicts'
        
        if dict_dir.exists():
            json_files = sorted(dict_dir.glob('*.json'))
            
            if not json_files:
                print(f"[WARNING] No JSON files found in {dict_dir}")
                print("[WARNING] Dictionary will be empty. Please check phonetic_dicts/ folder.")
                return default_dict
            
            for json_file in json_files:
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        category_dict = json.load(f)
                        default_dict.update(category_dict)
                        print(f"[INFO] Loaded {len(category_dict)} words from {json_file.name}")
                except Exception as e:
                    print(f"[WARNING] Could not load {json_file.name}: {e}")
            
            print(f"[INFO] Total phonetic dictionary: {len(default_dict)} words")
        else:
            print(f"[ERROR] Phonetic dict directory not found: {dict_dir}")
            print("[ERROR] Creating default fallback dictionary...")
            
            # FALLBACK: Basic words only if JSON files not found
            default_dict = {
                'hello': 'hé lô',
                'father': 'phá thơ',
                'mother': 'mơ thơ',
                'computer': 'cờm piu tơ',
                'facebook': 'phây búc',
                'google': 'gú gồ',
                'vietnam': 'việt nam',
                'japan': 'giờ pàn',
                'usa': 'iu ét ây'
            }
            print(f"[WARNING] Using minimal fallback dictionary with {len(default_dict)} words")
        
        # Load custom dictionary if provided
        if dict_path and Path(dict_path).exists():
            try:
                with open(dict_path, 'r', encoding='utf-8') as f:
                    custom_dict = json.load(f)
                    default_dict.update(custom_dict)
                    print(f"[INFO] Loaded {len(custom_dict)} custom words from {dict_path}")
            except Exception as e:
                print(f"[WARNING] Could not load custom phonetic dict: {e}")
        
        return default_dict
    
    def normalize(self, text, use_llm=False):
        """
        Main normalization pipeline with EN tag protection and phonetic conversion.
        
        Args:
            text: Input text to normalize
            use_llm: If True, use LLM for verification (requires llm_client)
        
        Returns:
            Normalized text ready for TTS
        """
        original_text = text
        
        # Step 1: Extract and protect EN tags, convert to phonetic
        en_contents = []
        en_phonetic_contents = []
        placeholder_base = "___EN_PLACEHOLDER_{}___ "
        
        def extract_and_convert_en(match):
            en_tag_full = match.group(0)
            en_content = match.group(1)
            
            en_contents.append(en_tag_full)
            
            phonetic = self._convert_english_to_phonetic(en_content)
            en_phonetic_contents.append(phonetic)
            
            return placeholder_base.format(len(en_contents) - 1)
        
        text = re.sub(r'<en>(.*?)</en>', extract_and_convert_en, text, flags=re.IGNORECASE | re.DOTALL)
        
        # Step 2: Normal normalization pipeline
        text = text.lower()
        text = self._normalize_temperature(text)
        text = self._normalize_currency(text)
        text = self._normalize_percentage(text)
        text = self._normalize_units(text)
        text = self._normalize_time(text)
        text = self._normalize_date(text)
        text = self._normalize_phone(text)
        text = self._normalize_versions(text)
        text = self._normalize_numbers(text)
        text = self._number_to_words(text)
        text = self._normalize_special_chars(text)
        text = self._normalize_whitespace(text)
        
        # Step 3: Restore EN tags with phonetic pronunciation
        for idx, phonetic in enumerate(en_phonetic_contents):
            placeholder = placeholder_base.format(idx).lower()
            # Debug: Check if placeholder exists in text
            if placeholder not in text:
                # Try without trailing space
                placeholder_no_space = placeholder.rstrip()
                if placeholder_no_space in text:
                    text = text.replace(placeholder_no_space, phonetic)
                else:
                    print(f"[WARNING] Placeholder not found: '{placeholder}' or '{placeholder_no_space}'")
                    print(f"[WARNING] Text content: {text[:200]}")
            else:
                text = text.replace(placeholder, phonetic + ' ')
        
        # Final whitespace cleanup
        text = self._normalize_whitespace(text)
        
        # Step 4: Optional LLM verification
        if use_llm and self.llm_client:
            text = self._llm_verify_and_correct(original_text, text)
        
        return text
    
    def _normalize_temperature(self, text):
        """Convert temperature notation to words."""
        text = re.sub(r'-(\d+(?:[.,]\d+)?)\s*°\s*c\b', r'âm \1 độ xê', text, flags=re.IGNORECASE)
        text = re.sub(r'-(\d+(?:[.,]\d+)?)\s*°\s*f\b', r'âm \1 độ ép', text, flags=re.IGNORECASE)
        text = re.sub(r'(\d+(?:[.,]\d+)?)\s*°\s*c\b', r'\1 độ xê', text, flags=re.IGNORECASE)
        text = re.sub(r'(\d+(?:[.,]\d+)?)\s*°\s*f\b', r'\1 độ ép', text, flags=re.IGNORECASE)
        text = re.sub(r'°', ' độ ', text)
        return text
    
    def _normalize_currency(self, text):
        """Convert currency notation to words with extended currency support."""
        def decimal_currency(match):
            whole = match.group(1)
            decimal = match.group(2)
            unit = match.group(3)
            decimal_words = ' '.join([self.digits[int(d)] for d in decimal])
            unit_map = {'k': 'nghìn', 'm': 'triệu', 'b': 'tỷ'}
            unit_word = unit_map.get(unit.lower(), unit)
            return f"{whole} phẩy {decimal_words} {unit_word}"
        
        text = re.sub(r'(\d+)[.,](\d+)\s*([kmb])\b', decimal_currency, text, flags=re.IGNORECASE)
        text = re.sub(r'(\d+)\s*k\b', r'\1 nghìn', text, flags=re.IGNORECASE)
        text = re.sub(r'(\d+)\s*m\b', r'\1 triệu', text, flags=re.IGNORECASE)
        text = re.sub(r'(\d+)\s*b\b', r'\1 tỷ', text, flags=re.IGNORECASE)
        
        sorted_currencies = sorted(self.currencies.items(), key=lambda x: len(x[0]), reverse=True)
        
        for symbol, name in sorted_currencies:
            escaped_symbol = re.escape(symbol)
            
            text = re.sub(rf'{escaped_symbol}\s*(\d+(?:[.,]\d+)?)', rf'\1 {name}', text, flags=re.IGNORECASE)
            text = re.sub(rf'(\d+(?:[.,]\d+)?)\s*{escaped_symbol}\b', rf'\1 {name}', text, flags=re.IGNORECASE)
        
        return text
    
    def _normalize_percentage(self, text):
        """Convert percentage to words."""
        text = re.sub(r'(\d+(?:[.,]\d+)?)\s*%', r'\1 phần trăm', text)
        return text
    
    def _normalize_units(self, text):
        """Convert measurement units to words."""
        def expand_compound_with_number(match):
            number = match.group(1)
            unit1 = match.group(2).lower()
            unit2 = match.group(3).lower()
            full_unit1 = self.units.get(unit1, unit1)
            full_unit2 = self.units.get(unit2, unit2)
            return f"{number} {full_unit1} trên {full_unit2}"
        
        def expand_compound_without_number(match):
            unit1 = match.group(1).lower()
            unit2 = match.group(2).lower()
            full_unit1 = self.units.get(unit1, unit1)
            full_unit2 = self.units.get(unit2, unit2)
            return f"{full_unit1} trên {full_unit2}"
        
        text = re.sub(r'(\d+(?:[.,]\d+)?)\s*([a-zA-Zμµ²³°]+)/([a-zA-Zμµ²³°0-9]+)\b', 
                     expand_compound_with_number, text)
        text = re.sub(r'\b([a-zA-Zμµ²³°]+)/([a-zA-Zμµ²³°0-9]+)\b', 
                     expand_compound_without_number, text)
        
        sorted_units = sorted(self.units.items(), key=lambda x: len(x[0]), reverse=True)
        for unit, full_name in sorted_units:
            pattern = r'(\d+(?:[.,]\d+)?)\s*' + re.escape(unit) + r'\b'
            text = re.sub(pattern, rf'\1 {full_name}', text, flags=re.IGNORECASE)
        
        for unit, full_name in sorted_units:
            if any(c in unit for c in '²³°'):
                pattern = r'\b' + re.escape(unit) + r'\b'
                text = re.sub(pattern, full_name, text, flags=re.IGNORECASE)
        
        return text
    
    def _normalize_time(self, text):
        """Convert time notation to words with validation."""
        
        def validate_and_convert_time(match):
            """Validate time components before converting."""
            groups = match.groups()
            
            # HH:MM:SS format
            if len(groups) == 3:
                hour, minute, second = groups
                hour_int, minute_int, second_int = int(hour), int(minute), int(second)
                
                if not (0 <= hour_int <= 23):
                    return match.group(0)
                if not (0 <= minute_int <= 59):
                    return match.group(0)
                if not (0 <= second_int <= 59):
                    return match.group(0)
                
                return f"{hour} giờ {minute} phút {second} giây"
            
            # HH:MM or HHhMM format
            elif len(groups) == 2:
                hour, minute = groups
                hour_int, minute_int = int(hour), int(minute)
                
                if not (0 <= hour_int <= 23):
                    return match.group(0)
                if not (0 <= minute_int <= 59):
                    return match.group(0)
                
                return f"{hour} giờ {minute} phút"
            
            # HHh format
            else:
                hour = groups[0]
                hour_int = int(hour)
                
                if not (0 <= hour_int <= 23):
                    return match.group(0)
                
                return f"{hour} giờ"
        
        text = re.sub(r'(\d{1,2}):(\d{2}):(\d{2})', validate_and_convert_time, text)
        text = re.sub(r'(\d{1,2}):(\d{2})', validate_and_convert_time, text)
        text = re.sub(r'(\d{1,2})h(\d{2})', validate_and_convert_time, text)
        text = re.sub(r'(\d{1,2})h\b', validate_and_convert_time, text)
        
        return text
    
    def _normalize_date(self, text):
        """Convert date notation to words with validation."""
        
        def is_valid_date(day, month, year):
            """Check if date components are valid."""
            day, month, year = int(day), int(month), int(year)
            
            if not (1 <= day <= 31):
                return False
            if not (1 <= month <= 12):
                return False

            return True
        
        def date_to_text(match):
            day, month, year = match.groups()
            if is_valid_date(day, month, year):
                return f"ngày {day} tháng {month} năm {year}"
            return match.group(0)
        
        def date_iso_to_text(match):
            year, month, day = match.groups()
            if is_valid_date(day, month, year):
                return f"ngày {day} tháng {month} năm {year}"
            return match.group(0)
        
        def date_short_year(match):
            day, month, year = match.groups()
            full_year = f"20{year}" if int(year) < 50 else f"19{year}"
            if is_valid_date(day, month, full_year):
                return f"ngày {day} tháng {month} năm {full_year}"
            return match.group(0)
        
        text = re.sub(r'\bngày\s+(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\b', 
                    lambda m: date_to_text(m).replace('ngày ngày', 'ngày'), text)
        text = re.sub(r'\bngày\s+(\d{1,2})[/\-](\d{1,2})[/\-](\d{2})\b', 
                    lambda m: date_short_year(m).replace('ngày ngày', 'ngày'), text)
        text = re.sub(r'\b(\d{4})-(\d{1,2})-(\d{1,2})\b', date_iso_to_text, text)
        text = re.sub(r'\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\b', date_to_text, text)
        text = re.sub(r'\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{2})\b', date_short_year, text)
        
        return text
    
    def _normalize_phone(self, text):
        """Convert phone numbers to digit-by-digit reading."""
        def phone_to_text(match):
            phone = match.group(0)
            phone = re.sub(r'[^\d]', '', phone)
            
            if phone.startswith('84') and len(phone) >= 10:
                phone = '0' + phone[2:]
            
            if 10 <= len(phone) <= 11:
                words = [self.digits[int(d)] for d in phone]
                return ' '.join(words) + ' '
            
            return match.group(0)
        
        text = re.sub(r'(\+84|84)[\s\-\.]?\d[\d\s\-\.]{7,}', phone_to_text, text)
        text = re.sub(r'\b0\d[\d\s\-\.]{8,}', phone_to_text, text)
        return text
    
    def _normalize_versions(self, text):
        """Convert version numbers like 1.0.4 to words."""
        def version_to_text(match):
            parts = match.group(0).split('.')
            # Convert each part to words if it's a number, or keep if not
            # But for versions, usually we just want the digits or numbers
            # The user requested "1 chấm 0 chấm 4"
            return ' chấm '.join(parts)
        
        # Match sequences of numbers separated by dots (at least 2 dots to be sure it's a version)
        # e.g., 1.0.4, 17.21.1, 192.168.1.1
        text = re.sub(r'\b\d+(?:\.\d+){1,}\b', version_to_text, text)
        return text
    
    def _normalize_numbers(self, text):
        text = re.sub(r'(\d+(?:[,.]\d+)?)%', lambda m: f'{m.group(1)} phần trăm', text)
        text = re.sub(r'(\d{1,3})(?:\.(\d{3}))+', lambda m: m.group(0).replace('.', ''), text)
    
        def decimal_to_words(match):
            whole = match.group(1)
            decimal = match.group(2)
            decimal_words = ' '.join([self.digits[int(d)] for d in decimal])
            separator = 'phẩy' if ',' in match.group(0) else 'chấm'
            return f"{whole} {separator} {decimal_words}"
        
        text = re.sub(r'(\d+),(\d+)', decimal_to_words, text)
        text = re.sub(r'(\d+)\.(\d{1,2})\b', decimal_to_words, text)
        
        return text
    
    def _read_two_digits(self, n):
        """Read two-digit numbers in Vietnamese."""
        if n < 10:
            return self.digits[n]
        elif n == 10:
            return "mười"
        elif n < 20:
            if n == 15:
                return "mười lăm"
            return f"mười {self.digits[n % 10]}"
        else:
            tens = n // 10
            ones = n % 10
            if ones == 0:
                return f"{self.digits[tens]} mươi"
            elif ones == 1:
                return f"{self.digits[tens]} mươi mốt"
            elif ones == 5:
                return f"{self.digits[tens]} mươi lăm"
            else:
                return f"{self.digits[tens]} mươi {self.digits[ones]}"
    
    def _read_three_digits(self, n):
        """Read three-digit numbers in Vietnamese."""
        if n < 100:
            return self._read_two_digits(n)
        
        hundreds = n // 100
        remainder = n % 100
        result = f"{self.digits[hundreds]} trăm"
        
        if remainder == 0:
            return result
        elif remainder < 10:
            result += f" lẻ {self.digits[remainder]}"
        else:
            result += f" {self._read_two_digits(remainder)}"
        
        return result
    
    def _convert_number_to_words(self, num):
        """Convert a number to Vietnamese words."""
        if num == 0:
            return "không"
        
        if num < 0:
            return f"âm {self._convert_number_to_words(-num)}"
        
        if num >= 1000000000:
            billion = num // 1000000000
            remainder = num % 1000000000
            result = f"{self._read_three_digits(billion)} tỷ"
            if remainder > 0:
                result += f" {self._convert_number_to_words(remainder)}"
            return result
        
        elif num >= 1000000:
            million = num // 1000000
            remainder = num % 1000000
            result = f"{self._read_three_digits(million)} triệu"
            if remainder > 0:
                result += f" {self._convert_number_to_words(remainder)}"
            return result
        
        elif num >= 1000:
            thousand = num // 1000
            remainder = num % 1000
            result = f"{self._read_three_digits(thousand)} nghìn"
            if remainder > 0:
                if remainder < 10:
                    result += f" không trăm lẻ {self.digits[remainder]}"
                elif remainder < 100:
                    result += f" không trăm {self._read_two_digits(remainder)}"
                else:
                    result += f" {self._read_three_digits(remainder)}"
            return result
        
        else:
            return self._read_three_digits(num)
    
    def _number_to_words(self, text):
        """Convert all remaining numbers to words."""
        def convert_number(match):
            num = int(match.group(0))
            return self._convert_number_to_words(num)
        
        text = re.sub(r'\b\d+\b', convert_number, text)
        return text
    
    def _normalize_special_chars(self, text):
        """Handle special characters."""
        # Remove quotes first to avoid creating spaces before commas
        text = text.replace('"', '')
        text = text.replace("'", '')
        text = text.replace(''', '')
        text = text.replace(''', '')
        text = text.replace('"', '')
        text = text.replace('"', '')
        
        text = text.replace('&', ' và ')
        text = text.replace('+', ' cộng ')
        text = text.replace('=', ' bằng ')
        text = text.replace('#', ' thăng ')
        # Handle parentheses/brackets as natural pauses: (text) -> , text ,
        text = re.sub(r'[\(\[\{]\s*(.*?)\s*[\)\]\}]', r', \1, ', text)
        
        # Remaining individual brackets or parens
        text = re.sub(r'[\[\]\(\)\{\}]', ' ', text)
        
        # Paired dashes (like parentheses): - text - -> , text ,
        text = re.sub(r'(?:\s+|^)[-–—]\s*(.*?)\s*[-–—](?:\s+|$)', r', \1 , ', text)
        
        # Single dashes used as punctuation (with spaces) -> comma
        text = re.sub(r'\s+[-–—]+\s+', ', ', text)
        
        # Dashes at the start of a line (bullet points) -> comma
        text = re.sub(r'^[-–—]+\s+', ', ', text)
        
        # Collapse multiple commas and surrounding spaces (remove spaces before AND after commas)
        text = re.sub(r'\s*,\s*', ', ', text)
        text = re.sub(r',\s*,+', ',', text)  # Remove duplicate commas
        
        text = re.sub(r'\.{2,}', ' ', text)
        text = re.sub(r'\s+\.\s+', ' ', text)
        text = re.sub(r'[^\w\sàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ.,!?;:@%_]', ' ', text)
        return text
    
    def _convert_english_to_phonetic(self, english_text):
        """
        Convert English text to Vietnamese phonetic pronunciation.
        Uses dictionary lookup with optional LLM fallback.
        
        Args:
            english_text: English text to convert
        
        Returns:
            Vietnamese phonetic pronunciation
        """
        english_text = english_text.strip()
        
        if english_text in self._phonetic_cache:
            return self._phonetic_cache[english_text]
        
        words = english_text.split()
        converted_words = []
        
        for word in words:
            clean_word = re.sub(r'[^\w]', '', word.lower())
            
            if clean_word in self.english_phonetic:
                converted_words.append(self.english_phonetic[clean_word])
            elif self.llm_client:
                try:
                    phonetic = self._llm_convert_phonetic(clean_word)
                    converted_words.append(phonetic)
                    self.english_phonetic[clean_word] = phonetic
                except Exception as e:
                    print(f"[WARNING] LLM phonetic conversion failed for '{clean_word}': {e}")
                    converted_words.append(word)
            else:
                converted_words.append(word)
        
        result = ' '.join(converted_words)
        self._phonetic_cache[english_text] = result
        
        return result
    
    def _llm_convert_phonetic(self, english_word):
        """
        Use LLM to convert English word to Vietnamese phonetic.
        
        Args:
            english_word: English word to convert
        
        Returns:
            Vietnamese phonetic pronunciation
        """
        if not self.llm_client:
            return english_word
        
        prompt = f"""Hãy chuyển từ tiếng Anh sau sang phiên âm tiếng Việt (cách người Việt thường đọc):

Tiếng Anh: {english_word}

Ví dụ:
- Hello -> hé lô
- Animals -> én ni mô
- Father -> phá thơ
- Computer -> cờm piu tơ
- Facebook -> phây búc

Chỉ trả về phiên âm tiếng Việt, không giải thích."""

        try:
            response = self.llm_client.generate(prompt)
            phonetic = response.strip().lower()
            return phonetic
        except Exception as e:
            print(f"[ERROR] LLM phonetic conversion error: {e}")
            return english_word
    
    def _llm_verify_and_correct(self, original_text, normalized_text):
        """
        Use LLM to verify that normalization preserves meaning.
        
        Args:
            original_text: Original input text
            normalized_text: Normalized text
        
        Returns:
            Verified/corrected normalized text
        """
        if not self.llm_client:
            return normalized_text
        
        prompt = f"""Kiểm tra xem văn bản sau khi chuẩn hóa có giữ nguyên ý nghĩa không:

Văn bản gốc: {original_text}
Văn bản đã chuẩn hóa: {normalized_text}

Yêu cầu:
1. Nếu ý nghĩa giữ nguyên hoàn toàn -> trả về văn bản đã chuẩn hóa
2. Nếu ý nghĩa thay đổi -> sửa lại văn bản chuẩn hóa để đúng ý nghĩa

Chỉ trả về văn bản cuối cùng, không giải thích."""

        try:
            response = self.llm_client.generate(prompt)
            verified_text = response.strip()
            return verified_text
        except Exception as e:
            print(f"[WARNING] LLM verification failed: {e}")
            return normalized_text
    
    def _normalize_whitespace(self, text):
        """Normalize whitespace."""
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        return text


if __name__ == "__main__":
    normalizer = VietnameseTTSNormalizer()
    
    test_texts = [
        "Chỉ cần thay đổi một dấu thanh, ý nghĩa của từ đã hoàn toàn khác biệt. Ví dụ như \"ma\", \"má\", \"mà\", \"mả\", \"mã\", \"mạ\" – đây chính là \"bài toán khó\" mà các kỹ sư công nghệ phải giải quyết để tạo ra một giọng đọc tự nhiên như người bản xứ.",
        "Phiên bản hiện tại là 1.0.4 và địa chỉ IP của tôi là 192.168.1.1",
        
        "Số điện thoại của tôi là 0866005541, hãy gọi cho tôi.",
        
        "Giá sản phẩm: 1000000đ, $100, €50, £30, ¥500, 50 yuan",
        
        "Tiền cryptocurrency: 0.5 BTC, 2 ETH, giá vàng 2000$/oz, giá bạc 25$/oz",
        
        "<en>Hello</en> xin chào! <en>Animals</en> rất đáng yêu. <en>Father</en> của tôi làm việc tại <en>Google</en>.",
        
        "<en>I love Vietnamese food</en> và tôi thích ăn phở.",
        
        "Nhiệt độ hôm nay là 25°C, giá cà phê $3.50, và tỷ lệ là 15%",
        
        "Tôi có 1000k trong tài khoản, bạn có 5m, còn anh ấy có 2b VND",
    ]
    
    print("=" * 100)
    print("VIETNAMESE TTS NORMALIZATION TEST - ENHANCED VERSION")
    print("Features: Extended Currency, English Phonetic, Phone Numbers")
    print("=" * 100)
    
    for i, text in enumerate(test_texts, 1):
        print(f"\n[Test {i}]")
        print(f"📝 Input:  {text}")
        normalized = normalizer.normalize(text)
        print(f"🎵 Output: {normalized}")
        print("-" * 100)