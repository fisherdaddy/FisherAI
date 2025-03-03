// 多语言支持
const i18n = {
    // 语言配置
    'zh-CN': {
        // 通用
        'settings': '设置',
        'share': '分享',
        'copy': '复制',
        'save': '保存',
        'cancel': '取消',
        'confirm': '确认',
        'apply': '应用',
        'delete': '删除',
        'loading': '加载中...',
        'success': '成功',
        'error': '错误',
        'warning': '警告',
        'info': '提示',
        'general': '通用',
        'language_settings': '语言设置',
        'included_features': '功能',
        'check_api': '连通行性测试',
        'check_api_success': '检查通过',
        'edit': '编辑',
        'add': '添加',
        'available_models': '可用模型',
        'edit_models': '编辑模型',
        'current_models': '当前模型',
        'add_model': '添加模型',
        'model_name': '模型名称',
        'save_changes': '保存更改',
        'usage_instructions': '使用说明',
        'ollama_explanation': 'Ollama模型直接从本地服务加载，无需编辑',
        'network_tools': '联网工具',
        'image_tools': '画图工具',
        'enable_provider': '启用此供应商',


        // ollama 说明
        'ollama_step1': '插件已支持使用 Ollama 来启动本地模型，启动服务时需要开启插件使用时的跨域。具体命令：OLLAMA_ORIGINS=* ollama serve',
        'ollama_step2': '在插件设置中的 Ollama 模型配置项中，输入你的 Ollama 服务地址，默认为：http://127.0.0.1:11434',
        'ollama_step3': '确认连通性测试通过后，点击保存。',
        'ollama_step4': '返回首页并刷新，在模型选择中，会显示本地模型支持的模型列表(以-ollama结尾)。选择所需模型后即可使用。',
        'ollama_note': '注意：如果还是有问题，请检查 ollama 是否正常启动，可以通过以下地址来访问本地 ollama 是否在正常启动：http://127.0.0.1:11434/api/tags',

        // 设置页面功能列表
        'feature_smart_summary': '网页摘要',
        'feature_full_translation': '网页翻译',
        'feature_chat_qa': '对话问答',
        'feature_quick_translation': '划词翻译',
        'feature_copy_content': '网页正文复制（右键）',
        'feature_download_subtitle': '视频字幕下载（Youtube、Bilibili）',
        
        
        // 侧边栏
        'slogan': 'FisherAI - Your Best Summary Copilot',
        'feature_recommend': '功能推荐：',
        'smart_summary': '智能摘要',
        'summary_desc': '支持多种格式，包括网页、PDF 文件、Bilibili 和 YouTube 视频。',
        'web_trans': '网页翻译',
        'web_trans_desc': '支持多种格式，包括网页、PDF 文件，保持原有布局和格式。',
        'video_trans': '视频翻译',
        'video_trans_desc': '支持 Bilibili 和 YouTube 视频。',
        
        // 设置页面
        'fisherai_settings': 'FisherAI 设置',
        'feature_intro': '功能介绍',
        'model_providers': '模型供应商',
        'quick_trans': '划词翻译',
        'about': '关于',
        
        // 提示文本
        'default_tips': '<p>请先去设置 <b>Model</b> 和 <b>API KEY</b>.</p><p class="note"><b>Note:</b> API KEY仅缓存在 Chrome 本地存储空间，不会上传服务器，以保证安全和隐私.</p>',
        
        // 快捷功能
        'shortcut_summary': '摘要',
        'shortcut_dict': '查词',
        'shortcut_translate': '翻译',
        'shortcut_polish': '润色',
        'shortcut_code_explain': '代码解释',
        'shortcut_image2text': '图像转文本',
        
        // 语言选择
        'language': '语言',
        'language_zh': '中文',
        'language_en': '英文',
        'language_ja': '日文',
        'language_ko': '韩文',
        'language_fr': '法文',
        'language_de': '德文',
        'language_ru': '俄文',

        // 模型下拉选择
        'free_models': '免费模型',
        'custom_config_models': '自定义配置模型',
        'ollama_local_models': 'Ollama 本地模型',
        'model_parameters': '模型参数',
        
        // 工具箱
        'toolbox': '工具箱',
        'tool_serpapi': 'SerpApi 搜索',
        'tool_dalle': 'DALL·E 图像生成',
        'upload_file': '上传文件',
        'new_chat': '新聊天',
        
        // 模型参数配置
        'temperature': '温度',
        'max_tokens': 'max tokens',
        'top_p': 'Top P',
        'top_k': 'Top K',
        'presence_penalty': '存在惩罚',
        'frequency_penalty': '频率惩罚',
        
        // 划词翻译设置
        'quick_trans_settings': '划词翻译设置',
        'enable_shortcut': '启用快捷键',
        'model_select': '选择模型',
        
        // 模型供应商详情页
        'api_key': 'API Key',
        'base_url': 'Base URL',
        'apply_for_api_key': '申请 API Key 官方地址',
        'model_list': '模型列表',
        
        // 其他
        'preview_area': '预览区域',

        // 模型供应商页面
        'model_providers_title': '模型供应商',
        'model_providers_mainstream': '支持主流模型供应商',
        'model_providers_custom_api': '支持自定义 API Key 和 API 代理地址',
        'model_providers_local_storage': '所有自定义配置仅存储在本地',
        
        // 关于页面
        'about_slogan': 'FisherAI —— Your Best Summary Copilot',
        'about_copyright': '© 2025 FisherAI',
    },
    'en-US': {
        // General
        'settings': 'Settings',
        'share': 'Share',
        'copy': 'Copy',
        'save': 'Save',
        'cancel': 'Cancel',
        'confirm': 'Confirm',
        'apply': 'Apply',
        'delete': 'Delete',
        'loading': 'Loading...',
        'success': 'Success',
        'error': 'Error',
        'warning': 'Warning',
        'info': 'Info',
        'general': 'General',
        'language_settings': 'Language Settings',
        'included_features': 'Features',
        'check_api': 'Check API',
        'check_api_success': 'Check Success',
        'edit': 'Edit',
        'add': 'Add',
        'available_models': 'Available Models',
        'edit_models': 'Edit Models',
        'current_models': 'Current Models',
        'add_model': 'Add Model',
        'model_name': 'Model Name',
        'save_changes': 'Save Changes',
        'usage_instructions': 'Usage Instructions',
        'ollama_explanation': 'Ollama models are loaded directly from the local service and do not need to be edited',
        'network_tools': 'Network Tools',
        'image_tools': 'Image Tools',
        'enable_provider': 'Enable Provider',
        
        // ollama 说明
        'ollama_step1': 'The plugin now supports using Ollama to start local models. When starting the service, you need to enable cross-domain when using the plugin. Specific command: OLLAMA_ORIGINS=* ollama serve',
        'ollama_step2': 'In the Ollama model configuration item in the plugin settings, input your Ollama service address, the default is: http://127.0.0.1:11434',
        'ollama_step3': 'After confirming the connection test is successful, click Save.',
        'ollama_step4': 'Return to the homepage and refresh. In the model selection, the local model supported model list (ending with -ollama) will be displayed. Select the required model to use.',
        'ollama_note': 'Note: If there are still issues, please check if the ollama is running normally. You can access the local ollama by the following address: http://127.0.0.1:11434/api/tags',

        // Settings page feature list
        'feature_smart_summary': 'Web Summary',
        'feature_full_translation': 'Web Translation',
        'feature_chat_qa': 'Chat',
        'feature_quick_translation': 'Quick Translation',
        'feature_copy_content': 'Right-click to copy webpage content',
        'feature_download_subtitle': 'download video subtitle ( Supports Youtube & Bilibili)',
        
        // Sidebar
        'slogan': 'FisherAI - Your Best Summary Copilot',
        'feature_recommend': 'Featured Functions:',
        'smart_summary': 'Smart Summary',
        'summary_desc': 'Supports multiple formats, including web pages, PDF files, Bilibili and YouTube videos.',
        'web_trans': 'Web Translation',
        'web_trans_desc': 'Supports multiple formats, including web pages and PDF files, maintaining the original layout and format.',
        'video_trans': 'Video Translation',
        'video_trans_desc': 'Supports Bilibili and YouTube videos.',
        
        // Settings page
        'fisherai_settings': 'FisherAI Settings',
        'feature_intro': 'Feature Introduction',
        'model_providers': 'Model Providers',
        'quick_trans': 'Quick Translation',
        'about': 'About',
        
        // Tips
        'default_tips': '<p>Please first set up your <b>Model</b> and <b>API KEY</b>.</p><p class="note"><b>Note:</b> API KEY is only cached in Chrome local storage and will not be uploaded to the server to ensure security and privacy.</p>',
        
        // Shortcuts
        'shortcut_summary': 'Summary',
        'shortcut_dict': 'Dictionary',
        'shortcut_translate': 'Translation',
        'shortcut_polish': 'Polish',
        'shortcut_code_explain': 'Code Explanation',
        'shortcut_image2text': 'Image to Text',
        
        // Language selection
        'language': 'Language',
        'language_zh': 'Chinese',
        'language_en': 'English',
        'language_ja': 'Japanese',
        'language_ko': 'Korean',
        'language_fr': 'French',
        'language_de': 'German',
        'language_ru': 'Russian',
        
        // Model dropdown selection
        'free_models': 'Free Models',
        'custom_config_models': 'Custom Configuration Models',
        'ollama_local_models': 'Ollama Local Models',
        'model_parameters': 'Model Parameters',
        
        // Toolbox
        'toolbox': 'Toolbox',
        'tool_serpapi': 'SerpApi',
        'tool_dalle': 'DALL·E',
        'upload_file': 'Upload File',
        'new_chat': 'New Chat',
        
        // Model parameter configuration
        'temperature': 'Temperature',
        'max_tokens': 'Max Tokens',
        'top_p': 'Top P',
        'top_k': 'Top K',
        'presence_penalty': 'Presence Penalty',
        'frequency_penalty': 'Frequency Penalty',
        
        // Quick translation settings
        'quick_trans_settings': 'Quick Translation Settings',
        'enable_shortcut': 'Enable Shortcut',
        'model_select': 'Select Model',
        
        // Model provider details page
        'api_key': 'API Key',
        'base_url': 'Base URL',
        'apply_for_api_key': 'Apply for API Key Official Address',
        'model_list': 'Model List',
        
        // Others
        'preview_area': 'Preview Area',

        // Model providers page
        'model_providers_title': 'Model Providers',
        'model_providers_mainstream': 'Supports mainstream model providers',
        'model_providers_custom_api': 'Supports custom API Keys and API proxy addresses',
        'model_providers_local_storage': 'All custom configurations are stored locally only',
        
        // About page
        'about_slogan': 'FisherAI —— Your Best Summary Copilot',
        'about_copyright': '© 2025 FisherAI',
    },
    'ja-JP': {
        // 通用
        "settings": "設定",
        "share": "共有",
        "copy": "コピー",
        "save": "保存",
        "cancel": "キャンセル",
        "confirm": "確認",
        "apply": "適用",
        "delete": "削除",
        "loading": "読み込み中...",
        "success": "成功",
        "error": "エラー",
        "warning": "警告",
        "info": "情報",
        "general": "一般",
        "language_settings": "言語設定",
        "included_features": "機能",
        "check_api": "連通行性テスト",
        "check_api_success": "検査通過",
        "edit": "編集",
        "add": "追加",
        "available_models": "利用可能なモデル",
        "edit_models": "モデルの編集",
        "current_models": "現在のモデル",
        "add_model": "モデルの追加",
        "model_name": "モデル名",
        "save_changes": "変更を保存",
        "usage_instructions": "使用説明",
        "ollama_explanation": "Ollamaモデルはローカルサービスから直接ロードされ、編集は不要です",
        "network_tools": "ネットワークツール",
        "image_tools": "画像ツール",
        "enable_provider": "このプロバイダーを有効にする",

        // ollama 说明
        "ollama_step1": "プラグインはOllamaを使用してローカルモデルを起動することをサポートしています。サービスを開始する際には、プラグイン使用時のクロスオリジンを有効にする必要があります。具体的なコマンド：OLLAMA_ORIGINS=* ollama serve",
        "ollama_step2": "プラグインの設定のOllamaモデル設定項目で、Ollamaサービスのアドレスを入力してください。デフォルトは：http://127.0.0.1:11434",
        "ollama_step3": "連通行性テストに合格したら、[保存]をクリックします。",
        "ollama_step4": "ホームページに戻って更新すると、モデル選択にローカルモデルでサポートされているモデルのリストが表示されます（-ollamaで終わる）。必要なモデルを選択して使用できます。",
        "ollama_note": "注意：まだ問題がある場合は、ollamaが正常に起動しているか確認してください。次のアドレスにアクセスして、ローカルのollamaが正常に起動しているか確認できます：http://127.0.0.1:11434/api/tags",

        // 设置页面功能列表
        "feature_smart_summary": "ウェブページの要約",
        "feature_full_translation": "ウェブページの翻訳",
        "feature_chat_qa": "対話型Q&A",
        "feature_quick_translation": "選択テキストの翻訳",
        "feature_copy_content": "ウェブページの本文のコピー（右クリック）",
        "feature_download_subtitle": "ビデオ字幕のダウンロード（Youtube、Bilibili）",

        // 侧边栏
        "slogan": "FisherAI - 最高の要約コパイロット",
        "feature_recommend": "おすすめ機能：",
        "smart_summary": "スマート要約",
        "summary_desc": "ウェブページ、PDFファイル、Bilibili、YouTube動画など、様々なフォーマットに対応しています。",
        "web_trans": "ウェブ翻訳",
        "web_trans_desc": "ウェブページ、PDFファイルなど、様々なフォーマットに対応し、元のレイアウトとフォーマットを維持します。",
        "video_trans": "動画翻訳",
        "video_trans_desc": "BilibiliとYouTube動画に対応しています。",

        // 设置页面
        "fisherai_settings": "FisherAI 設定",
        "feature_intro": "機能紹介",
        "model_providers": "モデルプロバイダー",
        "quick_trans": "選択テキストの翻訳",
        "about": "バージョン情報",

        // 提示文本
        "default_tips": "<p>最初に<b>Model</b>と<b>API KEY</b>を設定してください。</p><p class=\"note\"><b>Note:</b> API KEYはChromeのローカルストレージにのみキャッシュされ、安全とプライバシーを確保するためにサーバーにアップロードされることはありません。</p>",

        // 快捷功能
        "shortcut_summary": "要約",
        "shortcut_dict": "辞書",
        "shortcut_translate": "翻訳",
        "shortcut_polish": "推敲",
        "shortcut_code_explain": "コード説明",
        "shortcut_image2text": "画像からテキストへ",

        // 语言选择
        "language": "言語",
        "language_zh": "中国語",
        "language_en": "英語",
        "language_ja": "日本語",
        "language_ko": "韓国語",
        "language_fr": "フランス語",
        "language_de": "ドイツ語",
        "language_ru": "ロシア語",

        // 模型下拉选择
        "free_models": "無料モデル",
        "custom_config_models": "カスタム設定モデル",
        "ollama_local_models": "Ollamaローカルモデル",
        "model_parameters": "モデルパラメータ",

        // 工具箱
        "toolbox": "ツールボックス",
        "tool_serpapi": "SerpApi 検索",
        "tool_dalle": "DALL·E 画像生成",
        "upload_file": "ファイルをアップロード",
        "new_chat": "新しいチャット",

        // 模型参数配置
        "temperature": "温度",
        "max_tokens": "最大トークン数",
        "top_p": "Top P",
        "top_k": "Top K",
        "presence_penalty": "存在ペナルティ",
        "frequency_penalty": "頻度ペナルティ",

        // 划词翻译设置
        "quick_trans_settings": "選択テキストの翻訳設定",
        "enable_shortcut": "ショートカットを有効にする",
        "model_select": "モデルを選択",

        // 模型供应商详情页
        "api_key": "APIキー",
        "base_url": "ベースURL",
        "apply_for_api_key": "APIキーの申請公式アドレス",
        "model_list": "モデルリスト",

        // 其他
        "preview_area": "プレビューエリア",

        // 模型供应商页面
        "model_providers_title": "モデルプロバイダー",
        "model_providers_mainstream": "主流モデルプロバイダーをサポート",
        "model_providers_custom_api": "カスタムAPIキーとAPIプロキシアドレスをサポート",
        "model_providers_local_storage": "すべてのカスタム構成はローカルにのみ保存されます",

        // 关于页面
        "about_slogan": "FisherAI - 最高の要約コパイロット",
        "about_copyright": "© 2025 FisherAI"
    },
    'ko-KR': {
        // 통용
        "settings": "설정",
        "share": "공유",
        "copy": "복사",
        "save": "저장",
        "cancel": "취소",
        "confirm": "확인",
        "apply": "적용",
        "delete": "삭제",
        "loading": "로딩 중...",
        "success": "성공",
        "error": "오류",
        "warning": "경고",
        "info": "정보",
        "general": "일반",
        "language_settings": "언어 설정",
        "included_features": "기능",
        "check_api": "연결성 테스트",
        "check_api_success": "검사 통과",
        "edit": "편집",
        "add": "추가",
        "available_models": "사용 가능한 모델",
        "edit_models": "모델 편집",
        "current_models": "현재 모델",
        "add_model": "모델 추가",
        "model_name": "모델 이름",
        "save_changes": "변경 사항 저장",
        "usage_instructions": "사용 설명",
        "ollama_explanation": "Ollama 모델은 로컬 서비스에서 직접 로드되며 편집할 필요가 없습니다.",
        "network_tools": "네트워크 도구",
        "image_tools": "이미지 도구",
        "enable_provider": "이 공급자 활성화",

        // ollama 说明
        "ollama_step1": "플러그인은 Ollama를 사용하여 로컬 모델을 시작하는 것을 지원합니다. 서비스를 시작할 때 플러그인 사용 시 크로스 오리진을 활성화해야 합니다. 구체적인 명령어: OLLAMA_ORIGINS=* ollama serve",
        "ollama_step2": "플러그인 설정의 Ollama 모델 구성 항목에서 Ollama 서비스 주소를 입력하십시오. 기본값은 http://127.0.0.1:11434 입니다.",
        "ollama_step3": "연결성 테스트를 통과하면 '저장'을 클릭합니다.",
        "ollama_step4": "홈페이지로 돌아가서 새로고침하면 모델 선택에 로컬 모델에서 지원하는 모델 목록이 표시됩니다(-ollama로 끝남). 필요한 모델을 선택하여 사용할 수 있습니다.",
        "ollama_note": "주의: 여전히 문제가 있는 경우 ollama가 정상적으로 실행되고 있는지 확인하십시오. 다음 주소로 접속하여 로컬 ollama가 정상적으로 실행되고 있는지 확인할 수 있습니다. http://127.0.0.1:11434/api/tags",

        // 设置页面功能列表
        "feature_smart_summary": "웹 페이지 요약",
        "feature_full_translation": "웹 페이지 번역",
        "feature_chat_qa": "대화형 Q&A",
        "feature_quick_translation": "드래그 번역",
        "feature_copy_content": "웹 페이지 본문 복사 (마우스 오른쪽 버튼)",
        "feature_download_subtitle": "비디오 자막 다운로드 (Youtube, Bilibili)",

        // 侧边栏
        "slogan": "FisherAI - 최고의 요약 코파일럿",
        "feature_recommend": "추천 기능:",
        "smart_summary": "스마트 요약",
        "summary_desc": "웹 페이지, PDF 파일, Bilibili 및 YouTube 비디오를 포함한 다양한 형식을 지원합니다.",
        "web_trans": "웹 번역",
        "web_trans_desc": "웹 페이지, PDF 파일 등 다양한 형식을 지원하며, 원본 레이아웃과 형식을 유지합니다.",
        "video_trans": "비디오 번역",
        "video_trans_desc": "Bilibili 및 YouTube 비디오를 지원합니다.",

        // 设置页面
        "fisherai_settings": "FisherAI 설정",
        "feature_intro": "기능 소개",
        "model_providers": "모델 공급자",
        "quick_trans": "드래그 번역",
        "about": "정보",

        // 提示文本
        "default_tips": "<p>먼저 <b>Model</b>과 <b>API KEY</b>를 설정하십시오.</p><p class=\"note\"><b>Note:</b> API KEY는 Chrome 로컬 저장 공간에만 캐시되며 안전과 개인 정보 보호를 위해 서버에 업로드되지 않습니다.</p>",

        // 快捷功能
        "shortcut_summary": "요약",
        "shortcut_dict": "사전",
        "shortcut_translate": "번역",
        "shortcut_polish": "다듬기",
        "shortcut_code_explain": "코드 설명",
        "shortcut_image2text": "이미지 텍스트 변환",

        // 语言选择
        "language": "언어",
        "language_zh": "중국어",
        "language_en": "영어",
        "language_ja": "일본어",
        "language_ko": "한국어",
        "language_fr": "프랑스어",
        "language_de": "독일어",
        "language_ru": "러시아어",

        // 模型下拉选择
        "free_models": "무료 모델",
        "custom_config_models": "사용자 정의 구성 모델",
        "ollama_local_models": "Ollama 로컬 모델",
        "model_parameters": "모델 매개변수",

        // 工具箱
        "toolbox": "도구 상자",
        "tool_serpapi": "SerpApi 검색",
        "tool_dalle": "DALL·E 이미지 생성",
        "upload_file": "파일 업로드",
        "new_chat": "새로운 채팅",

        // 模型参数配置
        "temperature": "온도",
        "max_tokens": "최대 토큰 수",
        "top_p": "Top P",
        "top_k": "Top K",
        "presence_penalty": "존재 페널티",
        "frequency_penalty": "빈도 페널티",

        // 划词翻译设置
        "quick_trans_settings": "드래그 번역 설정",
        "enable_shortcut": "단축키 활성화",
        "model_select": "모델 선택",

        // 模型供应商详情页
        "api_key": "API 키",
        "base_url": "베이스 URL",
        "apply_for_api_key": "API 키 신청 공식 주소",
        "model_list": "모델 목록",

        // 其他
        "preview_area": "미리보기 영역",

        // 模型供应商页面
        "model_providers_title": "모델 공급자",
        "model_providers_mainstream": "주류 모델 공급자 지원",
        "model_providers_custom_api": "사용자 정의 API 키 및 API 프록시 주소 지원",
        "model_providers_local_storage": "모든 사용자 정의 구성은 로컬에만 저장됩니다.",

        // 关于页面
        "about_slogan": "FisherAI - 최고의 요약 코파일럿",
        "about_copyright": "© 2025 FisherAI" 
    },
    'fr-FR': {
        // 通用
        "settings": "Paramètres",
        "share": "Partager",
        "copy": "Copier",
        "save": "Enregistrer",
        "cancel": "Annuler",
        "confirm": "Confirmer",
        "apply": "Appliquer",
        "delete": "Supprimer",
        "loading": "Chargement...",
        "success": "Succès",
        "error": "Erreur",
        "warning": "Avertissement",
        "info": "Info",
        "general": "Général",
        "language_settings": "Paramètres de langue",
        "included_features": "Fonctionnalités",
        "check_api": "Test de connectivité API",
        "check_api_success": "Test réussi",
        "edit": "Modifier",
        "add": "Ajouter",
        "available_models": "Modèles disponibles",
        "edit_models": "Modifier les modèles",
        "current_models": "Modèles actuels",
        "add_model": "Ajouter un modèle",
        "model_name": "Nom du modèle",
        "save_changes": "Enregistrer les modifications",
        "usage_instructions": "Instructions d'utilisation",
        "ollama_explanation": "Les modèles Ollama sont chargés directement depuis le service local, aucune modification n'est requise",
        "network_tools": "Outils réseau",
        "image_tools": "Outils d'image",
        "enable_provider": "Activer ce fournisseur",

        // ollama 说明
        "ollama_step1": "Le plugin prend en charge l'utilisation d'Ollama pour démarrer un modèle local. Lors du démarrage du service, il est nécessaire d'activer le cross-origin lors de l'utilisation du plugin. Commande spécifique : OLLAMA_ORIGINS=* ollama serve",
        "ollama_step2": "Dans les paramètres du plugin, dans la configuration du modèle Ollama, entrez l'adresse de votre service Ollama. La valeur par défaut est : http://127.0.0.1:11434",
        "ollama_step3": "Une fois le test de connectivité réussi, cliquez sur [Enregistrer].",
        "ollama_step4": "Revenez à la page d'accueil et actualisez. Dans la sélection du modèle, la liste des modèles pris en charge par le modèle local s'affichera (se terminant par -ollama). Sélectionnez le modèle requis pour l'utiliser.",
        "ollama_note": "Remarque : Si vous rencontrez toujours des problèmes, veuillez vérifier si ollama est démarré normalement. Vous pouvez accéder à l'adresse suivante pour vérifier si ollama local est démarré normalement : http://127.0.0.1:11434/api/tags",

        // 设置页面功能列表
        "feature_smart_summary": "Résumé de page web",
        "feature_full_translation": "Traduction de page web",
        "feature_chat_qa": "Questions et réponses interactives",
        "feature_quick_translation": "Traduction de sélection",
        "feature_copy_content": "Copier le contenu de la page web (clic droit)",
        "feature_download_subtitle": "Téléchargement des sous-titres vidéo (Youtube, Bilibili)",

        // 侧边栏
        "slogan": "FisherAI - Votre meilleur copilote de résumé",
        "feature_recommend": "Fonctionnalités recommandées :",
        "smart_summary": "Résumé intelligent",
        "summary_desc": "Prend en charge différents formats, notamment les pages web, les fichiers PDF, les vidéos Bilibili et YouTube.",
        "web_trans": "Traduction web",
        "web_trans_desc": "Prend en charge différents formats, notamment les pages web, les fichiers PDF, en conservant la mise en page et le format d'origine.",
        "video_trans": "Traduction vidéo",
        "video_trans_desc": "Prend en charge les vidéos Bilibili et YouTube.",

        // 设置页面
        "fisherai_settings": "Paramètres FisherAI",
        "feature_intro": "Présentation des fonctionnalités",
        "model_providers": "Fournisseurs de modèles",
        "quick_trans": "Traduction de sélection",
        "about": "À propos",

        // 提示文本
        "default_tips": "<p>Veuillez d'abord définir le <b>Modèle</b> et la <b>Clé API</b>.</p><p class=\"note\"><b>Remarque :</b> La clé API est uniquement mise en cache dans l'espace de stockage local de Chrome et n'est pas téléchargée sur le serveur afin de garantir la sécurité et la confidentialité.</p>",

        // 快捷功能
        "shortcut_summary": "Résumé",
        "shortcut_dict": "Dictionnaire",
        "shortcut_translate": "Traduire",
        "shortcut_polish": "Peaufiner",
        "shortcut_code_explain": "Explication du code",
        "shortcut_image2text": "Image vers texte",

        // 语言选择
        "language": "Langue",
        "language_zh": "Chinois",
        "language_en": "Anglais",
        "language_ja": "Japonais",
        "language_ko": "Coréen",
        "language_fr": "Français",
        "language_de": "Allemand",
        "language_ru": "Russe",

        // 模型下拉选择
        "free_models": "Modèles gratuits",
        "custom_config_models": "Modèles de configuration personnalisés",
        "ollama_local_models": "Modèles locaux Ollama",
        "model_parameters": "Paramètres du modèle",

        // 工具箱
        "toolbox": "Boîte à outils",
        "tool_serpapi": "SerpApi",
        "tool_dalle": "DALL·E",
        "upload_file": "Téléverser un fichier",
        "new_chat": "Nouvelle conversation",

        // 模型参数配置
        "temperature": "Température",
        "max_tokens": "Max tokens",
        "top_p": "Top P",
        "top_k": "Top K",
        "presence_penalty": "Pénalité de présence",
        "frequency_penalty": "Pénalité de fréquence",

        // 划词翻译设置
        "quick_trans_settings": "Paramètres de traduction de sélection",
        "enable_shortcut": "Activer le raccourci",
        "model_select": "Sélectionner un modèle",

        // 模型供应商详情页
        "api_key": "Clé API",
        "base_url": "URL de base",
        "apply_for_api_key": "Adresse officielle de demande de clé API",
        "model_list": "Liste des modèles",

        // 其他
        "preview_area": "Zone de prévisualisation",

        // 模型供应商页面
        "model_providers_title": "Fournisseurs de modèles",
        "model_providers_mainstream": "Prise en charge des principaux fournisseurs de modèles",
        "model_providers_custom_api": "Prise en charge des clés API personnalisées et des adresses de proxy API",
        "model_providers_local_storage": "Toutes les configurations personnalisées sont stockées localement uniquement",

        // 关于页面
        "about_slogan": "FisherAI - Votre meilleur copilote de résumé",
        "about_copyright": "© 2025 FisherAI"
    },
    'de-DE': {
        // 通用
        "settings": "Einstellungen",
        "share": "Teilen",
        "copy": "Kopieren",
        "save": "Speichern",
        "cancel": "Abbrechen",
        "confirm": "Bestätigen",
        "apply": "Anwenden",
        "delete": "Löschen",
        "loading": "Laden...",
        "success": "Erfolg",
        "error": "Fehler",
        "warning": "Warnung",
        "info": "Info",
        "general": "Allgemein",
        "language_settings": "Spracheinstellungen",
        "included_features": "Funktionen",
        "check_api": "API-Konnektivitätstest",
        "check_api_success": "Test bestanden",
        "edit": "Bearbeiten",
        "add": "Hinzufügen",
        "available_models": "Verfügbare Modelle",
        "edit_models": "Modelle bearbeiten",
        "current_models": "Aktuelle Modelle",
        "add_model": "Modell hinzufügen",
        "model_name": "Modellname",
        "save_changes": "Änderungen speichern",
        "usage_instructions": "Gebrauchsanweisung",
        "ollama_explanation": "Ollama-Modelle werden direkt vom lokalen Dienst geladen, keine Bearbeitung erforderlich",
        "network_tools": "Netzwerk-Tools",
        "image_tools": "Bildbearbeitungswerkzeuge",
        "enable_provider": "Diesen Anbieter aktivieren",

        // ollama 说明
        "ollama_step1": "Das Plugin unterstützt die Verwendung von Ollama zum Starten eines lokalen Modells. Beim Starten des Dienstes muss Cross-Origin bei der Verwendung des Plugins aktiviert werden. Spezifischer Befehl: OLLAMA_ORIGINS=* ollama serve",
        "ollama_step2": "Geben Sie in den Plugin-Einstellungen im Ollama-Modellkonfigurationselement die Adresse Ihres Ollama-Dienstes ein. Der Standardwert ist: http://127.0.0.1:11434",
        "ollama_step3": "Klicken Sie nach bestandener Konnektivitätsprüfung auf [Speichern].",
        "ollama_step4": "Kehren Sie zur Startseite zurück und aktualisieren Sie sie. In der Modellauswahl wird die Liste der Modelle angezeigt, die vom lokalen Modell unterstützt werden (endet mit -ollama). Wählen Sie das gewünschte Modell aus, um es zu verwenden.",
        "ollama_note": "Hinweis: Wenn Sie weiterhin Probleme haben, überprüfen Sie, ob Ollama normal gestartet wurde. Sie können über die folgende Adresse auf den lokalen Ollama zugreifen, um zu überprüfen, ob er normal gestartet wurde: http://127.0.0.1:11434/api/tags",

        // 设置页面功能列表
        "feature_smart_summary": "Webseiten-Zusammenfassung",
        "feature_full_translation": "Webseiten-Übersetzung",
        "feature_chat_qa": "Chat-Q&A",
        "feature_quick_translation": "Schnellübersetzung",
        "feature_copy_content": "Webseitentext kopieren (Rechtsklick)",
        "feature_download_subtitle": "Video-Untertitel herunterladen (Youtube, Bilibili)",

        // 侧边栏
        "slogan": "FisherAI - Ihr bester Zusammenfassungs-Copilot",
        "feature_recommend": "Empfohlene Funktionen:",
        "smart_summary": "Intelligente Zusammenfassung",
        "summary_desc": "Unterstützt verschiedene Formate, darunter Webseiten, PDF-Dateien, Bilibili- und YouTube-Videos.",
        "web_trans": "Webseiten-Übersetzung",
        "web_trans_desc": "Unterstützt verschiedene Formate, darunter Webseiten, PDF-Dateien, wobei das ursprüngliche Layout und Format beibehalten werden.",
        "video_trans": "Video-Übersetzung",
        "video_trans_desc": "Unterstützt Bilibili- und YouTube-Videos.",

        // 设置页面
        "fisherai_settings": "FisherAI-Einstellungen",
        "feature_intro": "Funktionseinführung",
        "model_providers": "Modellanbieter",
        "quick_trans": "Schnellübersetzung",
        "about": "Über",

        // 提示文本
        "default_tips": "<p>Bitte konfigurieren Sie zuerst <b>Modell</b> und <b>API-Schlüssel</b>.</p><p class=\"note\"><b>Hinweis:</b> Der API-Schlüssel wird nur im lokalen Chrome-Speicher zwischengespeichert und nicht auf den Server hochgeladen, um Sicherheit und Datenschutz zu gewährleisten.</p>",

        // 快捷功能
        "shortcut_summary": "Zusammenfassung",
        "shortcut_dict": "Wörterbuch",
        "shortcut_translate": "Übersetzen",
        "shortcut_polish": "Feinschliff",
        "shortcut_code_explain": "Code-Erklärung",
        "shortcut_image2text": "Bild zu Text",

        // 语言选择
        "language": "Sprache",
        "language_zh": "Chinesisch",
        "language_en": "Englisch",
        "language_ja": "Japanisch",
        "language_ko": "Koreanisch",
        "language_fr": "Französisch",
        "language_de": "Deutsch",
        "language_ru": "Russisch",

        // 模型下拉选择
        "free_models": "Kostenlose Modelle",
        "custom_config_models": "Benutzerdefinierte Konfigurationsmodelle",
        "ollama_local_models": "Lokale Ollama-Modelle",
        "model_parameters": "Modellparameter",

        // 工具箱
        "toolbox": "Werkzeugkasten",
        "tool_serpapi": "SerpApi",
        "tool_dalle": "DALL·E",
        "upload_file": "Datei hochladen",
        "new_chat": "Neuer Chat",

        // 模型参数配置
        "temperature": "Temperatur",
        "max_tokens": "Max. Tokens",
        "top_p": "Top P",
        "top_k": "Top K",
        "presence_penalty": "Präsenzstrafe",
        "frequency_penalty": "Frequenzstrafe",

        // 划词翻译设置
        "quick_trans_settings": "Schnellübersetzungseinstellungen",
        "enable_shortcut": "Shortcut aktivieren",
        "model_select": "Modell auswählen",

        // 模型供应商详情页
        "api_key": "API-Schlüssel",
        "base_url": "Basis-URL",
        "apply_for_api_key": "Offizielle Adresse zur Beantragung eines API-Schlüssels",
        "model_list": "Modellliste",

        // 其他
        "preview_area": "Vorschau-Bereich",

        // 模型供应商页面
        "model_providers_title": "Modellanbieter",
        "model_providers_mainstream": "Unterstützung der gängigsten Modellanbieter",
        "model_providers_custom_api": "Unterstützung für benutzerdefinierte API-Schlüssel und API-Proxy-Adressen",
        "model_providers_local_storage": "Alle benutzerdefinierten Konfigurationen werden nur lokal gespeichert",

        // 关于页面
        "about_slogan": "FisherAI - Ihr bester Zusammenfassungs-Copilot",
        "about_copyright": "© 2025 FisherAI"
    },
    'ru-RU': {
        // 通用
        "settings": "Настройки",
        "share": "Поделиться",
        "copy": "Копировать",
        "save": "Сохранить",
        "cancel": "Отмена",
        "confirm": "Подтвердить",
        "apply": "Применить",
        "delete": "Удалить",
        "loading": "Загрузка...",
        "success": "Успех",
        "error": "Ошибка",
        "warning": "Предупреждение",
        "info": "Информация",
        "general": "Общие",
        "language_settings": "Языковые настройки",
        "included_features": "Функции",
        "check_api": "Проверка соединения с API",
        "check_api_success": "Проверка пройдена",
        "edit": "Редактировать",
        "add": "Добавить",
        "available_models": "Доступные модели",
        "edit_models": "Редактировать модели",
        "current_models": "Текущие модели",
        "add_model": "Добавить модель",
        "model_name": "Название модели",
        "save_changes": "Сохранить изменения",
        "usage_instructions": "Инструкции по использованию",
        "ollama_explanation": "Модели Ollama загружаются непосредственно с локального сервиса, редактирование не требуется",
        "network_tools": "Сетевые инструменты",
        "image_tools": "Инструменты для работы с изображениями",
        "enable_provider": "Включить этого провайдера",

        // ollama 说明
        "ollama_step1": "Плагин поддерживает использование Ollama для запуска локальных моделей. Для работы плагина необходимо включить CORS. Команда для запуска: OLLAMA_ORIGINS=* ollama serve",
        "ollama_step2": "В настройках плагина, в разделе Ollama, укажите адрес вашего сервера Ollama, по умолчанию: http://127.0.0.1:11434",
        "ollama_step3": "После успешной проверки соединения, нажмите «Сохранить».",
        "ollama_step4": "Вернитесь на главную страницу и обновите ее. В списке выбора моделей появятся локальные модели (с окончанием -ollama). Выберите нужную модель и начните использовать.",
        "ollama_note": "Внимание: Если возникли проблемы, проверьте, правильно ли запущен Ollama. Это можно проверить, открыв в браузере следующий адрес: http://127.0.0.1:11434/api/tags",

        // 设置页面功能列表
        "feature_smart_summary": "Сводка веб-страницы",
        "feature_full_translation": "Перевод веб-страницы",
        "feature_chat_qa": "Вопросы и ответы в чате",
        "feature_quick_translation": "Перевод выделенного текста",
        "feature_copy_content": "Копирование текста страницы (правой кнопкой мыши)",
        "feature_download_subtitle": "Скачивание субтитров (Youtube, Bilibili)",

        // 侧边栏
        "slogan": "FisherAI - Ваш лучший помощник для создания сводок",
        "feature_recommend": "Рекомендуемые функции:",
        "smart_summary": "Умная сводка",
        "summary_desc": "Поддерживает различные форматы, включая веб-страницы, PDF-файлы, видео Bilibili и YouTube.",
        "web_trans": "Перевод веб-страниц",
        "web_trans_desc": "Поддерживает различные форматы, включая веб-страницы, PDF-файлы, сохраняя исходную структуру и форматирование.",
        "video_trans": "Перевод видео",
        "video_trans_desc": "Поддерживает видео Bilibili и YouTube.",

        // 设置页面
        "fisherai_settings": "Настройки FisherAI",
        "feature_intro": "Описание функций",
        "model_providers": "Провайдеры моделей",
        "quick_trans": "Перевод выделенного текста",
        "about": "О программе",

        // 提示文本
        "default_tips": "<p>Пожалуйста, сначала настройте <b>Model</b> и <b>API KEY</b>.</p><p class=\"note\"><b>Note:</b> API KEY сохраняется только в локальном хранилище Chrome и не загружается на сервер для обеспечения безопасности и конфиденциальности.</p>",

        // 快捷功能
        "shortcut_summary": "Сводка",
        "shortcut_dict": "Словарь",
        "shortcut_translate": "Перевод",
        "shortcut_polish": "Редактирование",
        "shortcut_code_explain": "Объяснение кода",
        "shortcut_image2text": "Преобразование изображения в текст",

        // 语言选择
        "language": "Язык",
        "language_zh": "Китайский",
        "language_en": "Английский",
        "language_ja": "Японский",
        "language_ko": "Корейский",
        "language_fr": "Французский",
        "language_de": "Немецкий",
        "language_ru": "Русский",

        // 模型下拉选择
        "free_models": "Бесплатные модели",
        "custom_config_models": "Модели с пользовательской конфигурацией",
        "ollama_local_models": "Локальные модели Ollama",
        "model_parameters": "Параметры модели",

        // 工具箱
        "toolbox": "Инструменты",
        "tool_serpapi": "SerpApi",
        "tool_dalle": "DALL·E",
        "upload_file": "Загрузить файл",
        "new_chat": "Новый чат",

        // 模型参数配置
        "temperature": "Температура",
        "max_tokens": "Макс. токенов",
        "top_p": "Top P",
        "top_k": "Top K",
        "presence_penalty": "Штраф за присутствие",
        "frequency_penalty": "Штраф за частоту",

        // 划词翻译设置
        "quick_trans_settings": "Настройки перевода выделенного текста",
        "enable_shortcut": "Включить горячие клавиши",
        "model_select": "Выбор модели",

        // 模型供应商详情页
        "api_key": "API Key",
        "base_url": "Base URL",
        "apply_for_api_key": "Получить API Key на официальном сайте",
        "model_list": "Список моделей",

        // 其他
        "preview_area": "Область предпросмотра",

        // 模型供应商页面
        "model_providers_title": "Провайдеры моделей",
        "model_providers_mainstream": "Поддержка основных провайдеров моделей",
        "model_providers_custom_api": "Поддержка пользовательских API Key и адресов API-прокси",
        "model_providers_local_storage": "Все пользовательские настройки хранятся локально",

        // 关于页面
        "about_slogan": "FisherAI —— Ваш лучший помощник для создания сводок",
        "about_copyright": "© 2025 FisherAI"
    }
};

// 获取用户语言设置，默认为中文
function getUserLanguage() {
    return chrome.storage.local.get('language')
        .then(result => result.language || 'zh-CN');
}

// 根据语言和键值获取对应的文本
function getI18nMessage(key, lang) {
    // 如果未提供语言，获取当前语言
    if (!lang) {
        return getUserLanguage().then(language => {
            return i18n[language][key] || key;
        });
    }
    return Promise.resolve(i18n[lang][key] || key);
}

// 一次性获取多个翻译，用于初始化页面
function getI18nMessages(keys, lang) {
    return getUserLanguage().then(language => {
        const currentLang = lang || language;
        const result = {};
        keys.forEach(key => {
            result[key] = i18n[currentLang][key] || key;
        });
        return result;
    });
}

// 设置用户语言
function setUserLanguage(lang) {
    return chrome.storage.local.set({ 'language': lang })
        .then(() => {
            return true;
        });
}

// 初始化页面的国际化
function initI18n() {
    return getUserLanguage().then(language => {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const text = i18n[language][key] || key;
            if (element.tagName === 'INPUT' && element.type === 'placeholder') {
                element.placeholder = text;
            } else {
                element.textContent = text;
            }
        });
        return language;
    });
}

// 导出函数
window.i18n = {
    getMessage: getI18nMessage,
    getMessages: getI18nMessages,
    setLanguage: setUserLanguage,
    init: initI18n,
    getUserLanguage: getUserLanguage
}; 