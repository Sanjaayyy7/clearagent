from setuptools import setup, find_packages

setup(
    name="clearagent",
    version="0.1.0a1",
    description="ClearAgent Python SDK — EU AI Act compliance infrastructure (alpha)",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="ClearAgent",
    url="https://github.com/Sanjaayyy7/clearagent",
    packages=find_packages(),
    python_requires=">=3.10",
    install_requires=[
        "httpx>=0.27.0",
    ],
    extras_require={
        "dev": ["pytest", "pytest-httpx"],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries",
    ],
)
