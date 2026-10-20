import sys
import os

# Add application directory to sys.path
sys.path.insert(0, '/opt/virtual-office')
os.chdir('/opt/virtual-office')

from app import app as application
