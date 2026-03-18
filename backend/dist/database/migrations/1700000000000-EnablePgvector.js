"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnablePgvector1700000000000 = void 0;
class EnablePgvector1700000000000 {
    constructor() {
        this.name = 'EnablePgvector1700000000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP EXTENSION IF EXISTS vector`);
    }
}
exports.EnablePgvector1700000000000 = EnablePgvector1700000000000;
//# sourceMappingURL=1700000000000-EnablePgvector.js.map