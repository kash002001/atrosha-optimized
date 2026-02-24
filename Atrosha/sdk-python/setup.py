from setuptools import setup, find_packages

setup(
    name="atrosha-sdk",
    version="0.2.0",
    packages=find_packages(),
    install_requires=[
        "requests>=2.25.0",
    ],
    author="Atrosha",
    author_email="hello@atrosha.bond",
    url="https://atrosha.bond",
    description="Zero-trust proxy SDK for securing AI agent financial operations",
    long_description=open("README.md").read() if __import__("os").path.exists("README.md") else "",
    long_description_content_type="text/markdown",
    python_requires=">=3.8",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)
