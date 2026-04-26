import os, re
dirs = [
    'esprit_D2F-formation/src/main/java',
    'esprit_D2F-evaluation/src/main/java',
    'esprit_D2F-certificat/src/main/java',
    'esprit_D2F-besoin-formation/src/main/java',
    'esprit_D2F-authentification/src/main/java'
]
for d in dirs:
    for root, _, files in os.walk(d):
        for f in files:
            if f.endswith('.java'):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
                new_content = re.sub(r'@RequestMapping\(\"/(?!api/v1/)(.*)\"\)', r'@RequestMapping("/api/v1/\1")', content)
                
                # Special cases for auth
                new_content = new_content.replace('@RequestMapping("/api/v1/user/auth")', '@RequestMapping("/api/v1/auth")')
                new_content = new_content.replace('@RequestMapping("/api/v1/user/account")', '@RequestMapping("/api/v1/account")')
                
                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as file:
                        file.write(new_content)
                    print(f'Updated {path}')
