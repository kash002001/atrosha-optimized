from setuptools import setup, find_packages

setup(
    name="atrosha",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "requests>=2.25.0",
    ],
    description="Official Python SDK for Atrosha API",
    python_requires=">=3.7",
)
