interface ComplianceRule {
    id: string;
    description: string;
    check: () => Promise<boolean>;
    fix: () => Promise<void>;
    dependencies: string[];
  }
  
  class EnhancedComplianceChecker {
    private rules: Map<string, ComplianceRule> = new Map();
    private executionOrder: string[] = [];
    
    constructor() {
      this.initializeRules();
    }
  
    private initializeRules() {
      // Contract compilation rule
      this.addRule({
        id: 'contract_compilation',
        description: 'All contracts must compile without errors',
        check: async () => {
          try {
            await hre.run('compile');
            return true;
          } catch {
            return false;
          }
        },
        fix: async () => {
          console.log('Fixing contract compilation issues...');
          // Automated fixes would go here
        },
        dependencies: []
      });
  
      // ABI synchronization rule
      this.addRule({
        id: 'abi_sync',
        description: 'ABIs must match deployed contracts',
        check: async () => {
          const contractNames = ['IoTData', 'NFTData', 'IoTCertificationBridge'];
          for (const name of contractNames) {
            const artifact = await hre.artifacts.readArtifact(name);
            const storedABI = require(`../frontend/src/lib/blockchain/${name.toLowerCase()}-abi.json`);
            if (JSON.stringify(artifact.abi) !== JSON.stringify(storedABI)) {
              return false;
            }
          }
          return true;
        },
        fix: async () => {
          const contractNames = ['IoTData', 'NFTData', 'IoTCertificationBridge'];
          for (const name of contractNames) {
            const artifact = await hre.artifacts.readArtifact(name);
            fs.writeFileSync(
              `../frontend/src/lib/blockchain/${name.toLowerCase()}-abi.json`,
              JSON.stringify(artifact.abi, null, 2)
            );
          }
        },
        dependencies: ['contract_compilation']
      });
  
      // Role consistency rule
      this.addRule({
        id: 'role_consistency',
        description: 'Roles must be consistent across contracts and frontend',
        check: async () => {
          const iotContract = await hre.ethers.getContractAt('IoTData', IOT_ADDRESS);
          const nftContract = await hre.ethers.getContractAt('NFTData', NFT_ADDRESS);
          
          const frontendRoles = Object.values(ROLES).map(r => r.hash);
          const iotRoles = [
            await iotContract.ADMIN_ROLE(),
            await iotContract.DEVICE_ROLE(),
            await iotContract.ANALYST_ROLE()
          ];
          const nftRoles = [
            await nftContract.CERTIFIER_ROLE(),
            await nftContract.MINTER_ROLE()
          ];
          
          return frontendRoles.every(r => iotRoles.includes(r) || nftRoles.includes(r));
        },
        fix: async () => {
          console.log('Updating role definitions to ensure consistency...');
          // Update role definitions in contracts and frontend
        },
        dependencies: ['contract_compilation', 'abi_sync']
      });
    }
  
    private addRule(rule: ComplianceRule) {
      this.rules.set(rule.id, rule);
    }
  
    private topologicalSort(): string[] {
      const visited = new Set<string>();
      const result: string[] = [];
      
      const visit = (ruleId: string) => {
        if (visited.has(ruleId)) return;
        visited.add(ruleId);
        
        const rule = this.rules.get(ruleId);
        if (rule) {
          for (const dep of rule.dependencies) {
            visit(dep);
          }
          result.push(ruleId);
        }
      };
      
      for (const ruleId of this.rules.keys()) {
        visit(ruleId);
      }
      
      return result;
    }
  
    async runComplianceCheck(): Promise<{
      compliant: boolean;
      issues: string[];
      fixes: Array<() => Promise<void>>;
    }> {
      this.executionOrder = this.topologicalSort();
      const issues: string[] = [];
      const fixes: Array<() => Promise<void>> = [];
      
      for (const ruleId of this.executionOrder) {
        const rule = this.rules.get(ruleId)!;
        const passes = await rule.check();
        
        if (!passes) {
          issues.push(`Rule "${rule.description}" failed`);
          fixes.push(() => rule.fix());
        }
      }
      
      return {
        compliant: issues.length === 0,
        issues,
        fixes
      };
    }
  
    async autoFix(): Promise<void> {
      const { fixes } = await this.runComplianceCheck();
      
      for (const fix of fixes) {
        await fix();
      }
      
      // Run check again to verify fixes
      const { compliant } = await this.runComplianceCheck();
      
      if (!compliant) {
        throw new Error('Some compliance issues could not be automatically fixed');
      }
    }
  }