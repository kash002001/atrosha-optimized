from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="atrosha-sdk",
    version="0.1.0",
    author="kash002001",
    description="Official Python SDK for the Atrosha cryptographic AI proxy",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/kash002001/atrosha",
    packages=find_packages(),
    install_requires=[
        "requests>=2.25.0",
    ],
    python_requires=">=3.8",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Intended Audience :: Developers",
    ],
    keywords="atrosha ai agent proxy cryptographic security",
    project_urls={
        "Documentation": "https://atrosha.bond/docs",
        "Source": "https://github.com/kash002001/atrosha",
        "Bug Tracker": "https://github.com/kash002001/atrosha/issues",
    },
)
