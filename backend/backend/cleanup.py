import os
import shutil

def cleanup():
    # قائمة المجلدات والملفات المطلوب مسحها
    targets = {
        'dirs': [
            '__pycache__', 
            '.pytest_cache', 
            '.venv', 
            'venv', 
            'env', 
            'dist', 
            'build', 
            '.mypy_cache'
        ],
        'files': [
            '.DS_Store', 
            '*.pyc', 
            '*.pyo', 
            '*.pyd', 
            '*.db', 
            '*.sqlite3', 
            '.env'  # تأكد إن عندك نسخة تانية منه بره قبل ما تمسحه!
        ]
    }

    print("🚀 Starting cleanup process...")

    for root, dirs, files in os.walk('.', topdown=False):
        # مسح المجلدات
        for name in dirs:
            if name in targets['dirs']:
                dir_path = os.path.join(root, name)
                print(f"📁 Removing directory: {dir_path}")
                shutil.rmtree(dir_path, ignore_errors=True)

        # مسح الملفات
        for name in files:
            for pattern in targets['files']:
                if (pattern.startswith('*') and name.endswith(pattern[1:])) or name == pattern:
                    file_path = os.path.join(root, name)
                    print(f"📄 Removing file: {file_path}")
                    os.remove(file_path)

    print("✅ Cleanup finished! Your backend is ready for GitHub.")

if __name__ == "__main__":
    cleanup()