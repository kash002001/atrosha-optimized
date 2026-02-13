import os

# Configuration
ROOT_DIR = "."
OUTPUT_FILE = "clone.txt"

# Directories to ignore
IGNORE_DIRS = {
    ".git", ".vscode", ".idea", "__pycache__", 
    "target", ".next", "build", "coverage", ".venv", "env", "venv", ".gemini"
}

# Files to ignore
IGNORE_FILES = {
    "clone.txt", "package-lock.json", "yarn.lock", "Cargo.lock"
}

# Allowed file extensions to include in the clone.txt
ALLOWED_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".md", ".json", 
    ".yml", ".yaml", ".toml", ".rs", ".sh", ".ps1", ".sql", ".txt", ".env",
    ".dockerignore", ".gitignore", "Dockerfile", "Makefile", ".mjs", ".cjs"
}

def is_text_file(filename):
    return any(filename.endswith(ext) for ext in ALLOWED_EXTENSIONS) or filename in ALLOWED_EXTENSIONS

def main():
    print(f"Generating {OUTPUT_FILE} recursively from {ROOT_DIR}...")
    print(f"Ignoring directories: {IGNORE_DIRS}")
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as outfile:
        for root, dirs, files in os.walk(ROOT_DIR):
            # Modify dirs in-place to skip ignored directories
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                if file in IGNORE_FILES:
                    continue
                
                # Check extension or allow lists
                if not is_text_file(file) and file not in {"docker-compose.yml", "Dockerfile"}:
                    # Skip non-text files or files not in allowed list
                    continue

                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, ROOT_DIR)
                
                try:
                    with open(full_path, "r", encoding="utf-8", errors='ignore') as infile:
                        content = infile.read()
                        
                    outfile.write("\n")
                    outfile.write("=" * 50 + "\n")
                    outfile.write(f"FILE: {rel_path}\n")
                    outfile.write("=" * 50 + "\n")
                    outfile.write("\n")
                    outfile.write(content)
                    outfile.write("\n")
                    print(f"Added: {rel_path}")
                except Exception as e:
                    print(f"Skipping {rel_path}: {e}")

    print(f"Successfully generated {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
